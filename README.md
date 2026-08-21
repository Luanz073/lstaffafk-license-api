# LStaffAFK License API

API simples pra controlar em quais servidores um plugin pode rodar,
igual sistemas de licença de lojas tipo yStore.

## Como funciona

- Você cria uma "chave" de licença pra cada cliente/servidor
- O plugin, ao iniciar, manda a chave + o IP do servidor pra essa API
- A API confirma se pode rodar ali ou não
- Na primeira vez que uma chave é usada, ela é automaticamente
  "travada" naquele IP — se tentarem usar a mesma chave em outro
  servidor, é bloqueado

## Deploy no Railway (grátis, sem cartão)

1. Crie uma conta em https://railway.app (dá pra usar login do GitHub)
2. Suba essa pasta pra um repositório no GitHub (ou use o Railway CLI
   direto, mas o mais simples é via GitHub)
3. No Railway: **New Project → Deploy from GitHub repo** → selecione
   o repositório
4. Nas configurações do projeto (aba **Variables**), adicione:
   ```
   ADMIN_SECRET = uma-senha-forte-so-sua
   ```
5. O Railway vai te dar uma URL pública, tipo:
   ```
   https://lstaffafk-license-api-production.up.railway.app
   ```
   Essa é a URL que o plugin vai chamar.

## Testando localmente antes de subir (opcional)

```
npm install
node index.js
```
Abre em `http://localhost:3000`

## Gerenciando licenças

Todas as rotas `/admin/*` exigem o header `x-admin-secret` com a senha
que você definiu.

**Criar uma licença pra um cliente novo:**
```bash
curl -X POST https://SUA-URL/admin/licencas \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: SUA_SENHA" \
  -d '{"chave": "CLIENTE1-ABCD-1234", "dono": "Nome do Cliente"}'
```

**Ver todas as licenças:**
```bash
curl https://SUA-URL/admin/licencas \
  -H "x-admin-secret: SUA_SENHA"
```

**Desativar uma licença (ex: cliente pediu reembolso):**
```bash
curl -X PATCH https://SUA-URL/admin/licencas/CLIENTE1-ABCD-1234 \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: SUA_SENHA" \
  -d '{"ativa": false}'
```

**Liberar a chave pra trocar de servidor (resetar o IP travado):**
```bash
curl -X PATCH https://SUA-URL/admin/licencas/CLIENTE1-ABCD-1234 \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: SUA_SENHA" \
  -d '{"ip": null}'
```

## No plugin Java

Você configura no `config.yml` do plugin:
```yaml
license:
  chave: "CLIENTE1-ABCD-1234"
  api-url: "https://SUA-URL/verificar"
```
E o plugin, no `onEnable()`, consulta essa URL antes de ativar
qualquer funcionalidade.
