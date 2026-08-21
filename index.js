const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());

const DB_PATH = path.join(__dirname, "licenses.json");

// Senha usada pra você (o dono) gerenciar as licenças.
// Em produção, defina isso como variável de ambiente no Railway (ADMIN_SECRET),
// nunca deixe fixo no código quando for pra internet de verdade.
const ADMIN_SECRET = process.env.ADMIN_SECRET || "troque-essa-senha";

function loadLicenses() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ licenses: [] }, null, 2));
  }
  return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
}

function saveLicenses(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// Rota de teste, só pra ver se a API está no ar
app.get("/", (req, res) => {
  res.json({ status: "online", service: "lstaffafk-license-api" });
});

/**
 * Rota que o PLUGIN chama para verificar se pode rodar.
 * Body esperado: { "chave": "ABC-123", "ip": "servidor.com", "porta": 25565 }
 */
app.post("/verificar", (req, res) => {
  const { chave, ip, porta } = req.body || {};

  if (!chave || !ip) {
    return res.status(400).json({ autorizado: false, motivo: "dados incompletos" });
  }

  const db = loadLicenses();
  const licenca = db.licenses.find((l) => l.chave === chave);

  if (!licenca) {
    return res.json({ autorizado: false, motivo: "chave nao encontrada" });
  }

  if (!licenca.ativa) {
    return res.json({ autorizado: false, motivo: "licenca desativada" });
  }

  // Se a licença já tem um IP vinculado, precisa bater.
  // Se ainda não tem (primeiro uso), vincula automaticamente a esse IP.
  if (!licenca.ip) {
    licenca.ip = ip;
    saveLicenses(db);
  } else if (licenca.ip !== ip) {
    return res.json({ autorizado: false, motivo: "chave ja vinculada a outro servidor" });
  }

  return res.json({ autorizado: true, dono: licenca.dono || null });
});

/**
 * Rotas administrativas (protegidas por senha) pra você gerenciar licenças
 * sem precisar mexer direto no arquivo. Manda o header: x-admin-secret
 */
function checkAdmin(req, res, next) {
  if (req.headers["x-admin-secret"] !== ADMIN_SECRET) {
    return res.status(401).json({ erro: "nao autorizado" });
  }
  next();
}

// Listar todas as licenças
app.get("/admin/licencas", checkAdmin, (req, res) => {
  const db = loadLicenses();
  res.json(db.licenses);
});

// Criar uma nova licença. Body: { "chave": "ABC-123", "dono": "Fulano" }
app.post("/admin/licencas", checkAdmin, (req, res) => {
  const { chave, dono } = req.body || {};
  if (!chave) return res.status(400).json({ erro: "chave obrigatoria" });

  const db = loadLicenses();
  if (db.licenses.some((l) => l.chave === chave)) {
    return res.status(409).json({ erro: "chave ja existe" });
  }

  db.licenses.push({ chave, dono: dono || null, ip: null, ativa: true });
  saveLicenses(db);
  res.json({ ok: true });
});

// Ativar/desativar uma licença. Body: { "ativa": true/false }
app.patch("/admin/licencas/:chave", checkAdmin, (req, res) => {
  const db = loadLicenses();
  const licenca = db.licenses.find((l) => l.chave === req.params.chave);
  if (!licenca) return res.status(404).json({ erro: "nao encontrada" });

  if (typeof req.body.ativa === "boolean") licenca.ativa = req.body.ativa;
  if ("ip" in req.body) licenca.ip = req.body.ip; // permite resetar o IP vinculado

  saveLicenses(db);
  res.json({ ok: true, licenca });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API de licenca rodando na porta ${PORT}`);
});
