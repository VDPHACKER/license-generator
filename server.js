
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

/**
 * Middleware de sécurité optionnel pour vérifier la clé API
 */
const checkApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.split(' ')[1];
  
  // Pour la démo, on accepte tout si aucune clé n'est configurée sur le serveur
  // Mais vous pourriez ajouter ici : if (apiKey !== "MA_CLE_SECRETE") return res.status(401)...
  
  console.log(`[AUTH] Requête reçue avec clé : ${apiKey ? 'PRESENT' : 'ABSENTE'}`);
  next();
};

// Base de données simulée
const generatedLicenses = [];

/**
 * Route : Générer une licence
 */
app.post('/admin/generate-license', checkApiKey, (req, res) => {
  try {
    const { macAddress, durationDays } = req.body;

    if (!durationDays || isNaN(durationDays)) {
      return res.status(400).json({ 
        success: false, 
        message: "La durée de validité est requise." 
      });
    }

    const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
    const macSuffix = macAddress ? macAddress.replace(/:/g, '').substring(0, 6) : 'GLB';
    const licenseKey = `VDP-${randomHex}-${macSuffix}-${Math.floor(Math.random() * 1000)}`;

    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + parseInt(durationDays));

    const newLicense = {
      success: true,
      licenseKey: licenseKey,
      expirationDate: expirationDate.toISOString().split('T')[0],
      macAddress: macAddress || "Globale",
      createdAt: new Date().toISOString(),
      message: "Licence générée avec succès"
    };

    generatedLicenses.push(newLicense);
    res.json(newLicense);
  } catch (error) {
    res.status(500).json({ success: false, message: "Erreur serveur." });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: "running" });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend prêt sur http://localhost:${PORT}`);
});
