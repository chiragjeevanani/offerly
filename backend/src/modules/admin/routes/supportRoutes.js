import express from 'express';
import { getSupportContacts } from '../controllers/supportSettingsController.js';

// Public: the support email / phone / WhatsApp / hours shown in the apps.
const router = express.Router();
router.get('/', getSupportContacts);

export default router;
