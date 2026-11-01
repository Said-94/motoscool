/**
 * Proxy IA de l'assistant Moto's Cool — Cloudflare Worker.
 *
 * Le site est statique : il ne peut pas contenir de clé d'API. Ce Worker reçoit les messages
 * de l'assistant, ajoute les consignes (prompt système) et appelle l'API Claude d'Anthropic
 * avec la clé stockée en secret Cloudflare (ANTHROPIC_API_KEY). Voir README.md.
 *
 * Requête  : POST { messages: [{ role: 'user' | 'assistant', content: string }, ...] }
 * Réponse  : 200 { reply: string }  |  4xx/5xx { error: string } (le site repasse alors en mode intégré)
 */
import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-haiku-5-5';
const MAX_TOKENS = 1024;          // plafond de la réponse (réflexion comprise)
const MAX_TURNS = 10;             // historique conservé
const MAX_CHARS = 500;            // longueur maximale d'un message client
const RATE = { limit: 20, windowMs: 60_000 }; // 20 messages / minute / adresse IP (repli si pas de binding)

// Consignes de l'assistant : faits du site uniquement, objectif = amener le client à l'atelier.
const SYSTEM = `Tu es l'assistant automatique du site de Moto's Cool, garage moto et scooter à Vitry-sur-Seine (94). Tu réponds en français, de façon chaleureuse, claire et brève (4 à 6 phrases maximum, sans titres ni listes longues, sans markdown).

TON OBJECTIF : amener le client chez Moto's Cool (appel, rendez-vous en ligne ou passage à l'atelier). Tu n'aides jamais le client à réparer lui-même.

FAITS (n'utilise que ceux-ci, n'en invente aucun) :
- Adresse : 15 ter avenue du Président Salvador Allende, 94400 Vitry-sur-Seine. Téléphone : 01 43 76 26 38.
- Horaires : du lundi au vendredi 9h30–18h30, samedi 10h00–18h30, fermé le dimanche. On peut venir sans rendez-vous pendant les horaires ; le rendez-vous en ligne réserve un créneau.
- Services : entretien et révision selon le carnet constructeur, réparation mécanique (moteur, embrayage, transmission, électricité, suspensions), diagnostic, freinage et pneus, scooters toutes cylindrées, dépannage et remorquage.
- Marques : Yamaha, Honda, Suzuki, Kawasaki, Piaggio, Vespa, Ducati, Moto Guzzi, Triumph, BMW ; pour une autre marque, appeler.
- Dépannage uniquement à Paris (75), en Seine-et-Marne (77), dans l'Essonne (91) et le Val-de-Marne (94), par des véhicules équipés partant de l'atelier. Le délai est annoncé au téléphone selon la commune et le trafic.
- Paiements acceptés : carte bancaire (y compris sans contact), Revolut, espèces, virement. Refusés : PayPal, chèque, paiement en plusieurs fois.
- Réparations et ventes garanties ; conditions précisées sur le devis et la facture.
- Techniciens qualifiés et diplômés.

RÈGLES STRICTES :
1. AUCUN PRIX, JAMAIS : ni montant, ni fourchette, ni estimation, ni « à partir de », pour quoi que ce soit (diagnostic, dépannage, main-d'œuvre, pièces), même approximativement. À toute question de prix, réponds que le prix se voit ensemble avec l'équipe, après le diagnostic et le devis que le client valide (« on voit ça ensemble »), puis invite à appeler ou à prendre rendez-vous.
2. N'invente jamais de délai chiffré, de promotion, de remise, de garantie ou d'information absente des faits ci-dessus. Si tu ne sais pas, dis-le et propose d'appeler le 01 43 76 26 38.
3. Jamais de tutoriel, d'étapes de réparation, de références de pièces, de couples de serrage ni de réglages. Si on te le demande, refuse poliment et explique qu'un technicien doit voir la moto.
4. Quand un client décrit un problème : accueille-le avec bienveillance, cite au plus quelques causes possibles en termes généraux, explique qu'un diagnostic fiable demande un contrôle à l'atelier, donne une ou deux raisons de choisir Moto's Cool (techniciens qualifiés, toutes marques, diagnostic puis devis clair, réparations garanties, venue sans rendez-vous possible, dépannage réactif en 75/77/91/94).
5. Symptômes critiques (freins qui ne freinent plus ou mal, direction anormale, odeur ou fuite d'essence, fumée, après une chute ou un accident) : conseille de ne pas rouler, de se mettre en sécurité et d'appeler le 01 43 76 26 38 pour un dépannage.
6. Reste honnête : pas de dramatisation, pas de pression commerciale.
7. Termine TOUJOURS par un appel à l'action concret : appeler le 01 43 76 26 38, prendre rendez-vous en ligne, ou passer à l'atelier.
8. Hors sujet (autre chose que les deux-roues et Moto's Cool) : réponds poliment que tu ne peux aider que pour Moto's Cool.
9. Ne demande jamais de données personnelles (nom, adresse, plaque) : le client les donnera dans le formulaire de rendez-vous.`;

const FALLBACK = "Je ne peux pas répondre pour le moment. Appelez l'atelier au 01 43 76 26 38 ou prenez rendez-vous en ligne : l'équipe vous répondra directement.";

// Limitation de débit de secours, par instance (le binding Cloudflare RATE_LIMITER est préférable)
const hits = new Map();
function limitedLocally(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter(t => now - t < RATE.windowMs);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > RATE.limit;
}

function cors(origin, allowed) {
  const ok = allowed.includes(origin);
  return {
    'Access-Control-Allow-Origin': ok ? origin : allowed[0] || 'null',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}
const json = (body, status, headers) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers } });

// Nettoie l'historique reçu du navigateur : rôles alternés, texte seulement, longueur bornée
function sanitize(messages) {
  if (!Array.isArray(messages)) return null;
  const out = [];
  for (const m of messages.slice(-MAX_TURNS)) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string') continue;
    const content = m.content.trim().slice(0, m.role === 'user' ? MAX_CHARS : 2000);
    if (!content) continue;
    if (out.length && out[out.length - 1].role === m.role) out[out.length - 1].content += '\n' + content;
    else out.push({ role: m.role, content });
  }
  while (out.length && out[0].role !== 'user') out.shift();
  return out.length && out[out.length - 1].role === 'user' ? out : null;
}

export default {
  async fetch(request, env) {
    const allowed = String(env.ALLOWED_ORIGINS || 'https://motoscool.fr').split(',').map(s => s.trim()).filter(Boolean);
    const origin = request.headers.get('Origin') || '';
    const headers = cors(origin, allowed);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405, headers);
    if (!allowed.includes(origin)) return json({ error: 'Origine non autorisée' }, 403, headers);

    const ip = request.headers.get('CF-Connecting-IP') || 'inconnue';
    if (env.RATE_LIMITER) {
      const { success } = await env.RATE_LIMITER.limit({ key: ip });
      if (!success) return json({ error: 'Trop de messages, réessayez dans une minute.' }, 429, headers);
    } else if (limitedLocally(ip)) {
      return json({ error: 'Trop de messages, réessayez dans une minute.' }, 429, headers);
    }

    let body;
    try { body = await request.json(); } catch (e) { return json({ error: 'Requête invalide' }, 400, headers); }
    const messages = sanitize(body && body.messages);
    if (!messages) return json({ error: 'Message manquant' }, 400, headers);

    if (!env.ANTHROPIC_API_KEY) return json({ error: 'Assistant non configuré' }, 503, headers);
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 1, timeout: 20_000 });

    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM,
        output_config: { effort: 'low' }, // conversation simple : réflexion minimale, réponse rapide
        messages
      });
      // Refus des filtres de sécurité ou réponse tronquée (plafond de jetons atteint) : on ne renvoie rien
      // d'incomplet ; le site affiche alors la réponse de l'assistant intégré, avec ses boutons d'action.
      if (response.stop_reason === 'refusal') return json({ error: 'Réponse refusée' }, 502, headers);
      if (response.stop_reason === 'max_tokens') return json({ error: 'Réponse tronquée' }, 502, headers);
      // La réponse peut commencer par des blocs « thinking » : on ne garde que le texte
      const reply = response.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
      return json({ reply: reply || FALLBACK }, 200, headers);
    } catch (err) {
      if (err instanceof Anthropic.RateLimitError) return json({ error: 'Service saturé' }, 503, headers);
      if (err instanceof Anthropic.APIConnectionError) return json({ error: 'Service injoignable' }, 502, headers);
      if (err instanceof Anthropic.APIError) return json({ error: 'Erreur du service IA' }, 502, headers);
      return json({ error: 'Erreur interne' }, 500, headers);
    }
  }
};
