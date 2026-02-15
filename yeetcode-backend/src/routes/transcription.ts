import express from 'express';

const router = express.Router();

router.get('/status', (req, res) => {
  res.json({
    status: 'operational',
    service: 'transcription',
    timestamp: Date.now()
  });
});

export default router;
