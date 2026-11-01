# Assistant IA de Moto's Cool : proxy Cloudflare Worker

Le site est statique (GitHub Pages) : il ne peut pas contenir de clé d'API. Ce petit serveur
(un *Worker* Cloudflare) reçoit les messages de l'assistant du site, ajoute les consignes de
Moto's Cool et interroge l'API Claude d'Anthropic (modèle `claude-haiku-5-5`). La clé reste
côté Cloudflare, dans un secret, et n'apparaît jamais dans le site.

Tant que ce proxy n'est pas déployé, l'assistant du site fonctionne déjà en **mode intégré** :
il répond à partir des informations du site, sans IA et sans rien envoyer à un serveur.

## Ce que fait le proxy

- **Consignes strictes** (`SYSTEM` dans `worker.js`) : uniquement les faits de Moto's Cool ;
  aucun prix, fourchette ni estimation ; aucun tutoriel de réparation ; conseil de ne pas rouler
  et d'appeler le dépannage pour les symptômes dangereux ; chaque réponse se termine par une
  invitation à appeler, prendre rendez-vous ou passer à l'atelier.
- **CORS limité** au site (`ALLOWED_ORIGINS` dans `wrangler.toml`) : les autres sites sont refusés.
- **Limitation de débit** : 20 messages par minute et par adresse IP.
- **Réponses courtes** : 1 024 jetons maximum par réponse, 10 derniers messages conservés,
  500 caractères maximum par message du client.
- **Repli automatique** : en cas d'erreur, de refus ou de réponse tronquée, le site affiche la
  réponse de l'assistant intégré.

## Déploiement (une quinzaine de minutes)

Prérequis : Node.js 20 ou plus, un compte Cloudflare (gratuit) et une clé d'API Anthropic
(console.anthropic.com → *API Keys*).

```bash
cd ai-proxy
npm install
npx wrangler login                      # ouvre le navigateur pour se connecter à Cloudflare
npx wrangler secret put ANTHROPIC_API_KEY   # collez la clé Anthropic quand elle est demandée
npx wrangler deploy
```

`wrangler deploy` affiche l'adresse du Worker, par exemple
`https://motoscool-assistant.<votre-compte>.workers.dev`.

Puis, dans `index.html`, en haut du script principal, renseignez cette adresse :

```js
aiEndpoint: 'https://motoscool-assistant.<votre-compte>.workers.dev',
```

Vérifiez que l'adresse du site figure dans `ALLOWED_ORIGINS` (`wrangler.toml`) ; ajoutez
l'adresse GitHub Pages pendant les tests (ex. `https://said-94.github.io`), puis redéployez.

Pour désactiver l'IA : remettez `aiEndpoint: ''`. Le site repasse aussitôt en mode intégré.

## Tester en local

```bash
npx wrangler dev
```

Le Worker répond alors sur `http://localhost:8787`. Ajoutez temporairement l'origine locale
du site (ex. `http://localhost:8080`) à `ALLOWED_ORIGINS`.

## Coût

Le modèle `claude-haiku-5-5` est le plus économique : 0,10 $ par million de jetons envoyés et
0,50 $ par million de jetons générés (tarif public Anthropic pour des requêtes de moins de
100 000 jetons ; à vérifier sur la page de tarifs d'Anthropic avant mise en service). Une
conversation de l'assistant pèse environ 2 000 à 4 000 jetons, soit **moins d'un dixième de
centime par conversation** : quelques centaines de conversations par mois coûtent moins d'un
euro. Le Worker Cloudflare reste dans l'offre gratuite (100 000 requêtes par jour).

Conseil : fixez une limite de dépense mensuelle dans la console Anthropic (*Billing → Limits*).

## Données personnelles

En mode IA, le texte des messages est transmis à Anthropic pour générer la réponse. La
politique de confidentialité du site (`confidentialite.html`, section « Assistant ») le
mentionne. Avant la mise en service : vérifiez les conditions de conservation des données
d'Anthropic et complétez la politique de confidentialité si besoin.
