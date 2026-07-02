const request = require('supertest');
const express = require('express');

const app = express();
app.use(express.json());

jest.mock('../services/mailer', () => ({
  enviarCorreo: jest.fn()
}));

const { enviarCorreo } = require('../services/mailer');
const notificationRoutes = require('../routes/mail.routes');
app.use('/notify', notificationRoutes);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /notify/reserva', () => {
  it('should send reservation confirmation email', async () => {
    enviarCorreo.mockResolvedValue({ messageId: 'mock-id' });

    const res = await request(app)
      .post('/notify/reserva')
      .send({
        email: 'user@example.com',
        nombre: 'Test User',
        servicio: 'Habitación Doble',
        fecha: '01/07/2026 14:30'
      });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Correo enviado correctamente');
    expect(enviarCorreo).toHaveBeenCalledTimes(1);
  });

  it('should handle mailer error', async () => {
    enviarCorreo.mockRejectedValue(new Error('SMTP error'));

    const res = await request(app)
      .post('/notify/reserva')
      .send({
        email: 'user@example.com',
        nombre: 'Test User',
        servicio: 'Habitación Doble',
        fecha: '01/07/2026 14:30'
      });

    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Error al enviar el correo de reserva');
  });
});

describe('POST /notify/cancelacion', () => {
  it('should send cancellation email', async () => {
    enviarCorreo.mockResolvedValue({ messageId: 'mock-id' });

    const res = await request(app)
      .post('/notify/cancelacion')
      .send({
        email: 'user@example.com',
        nombre: 'Test User',
        servicio: 'Habitación Doble',
        fecha: '01/07/2026 14:30'
      });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Correo de cancelación enviado correctamente');
  });

  it('should handle mailer error on cancellation', async () => {
    enviarCorreo.mockRejectedValue(new Error('SMTP error'));

    const res = await request(app)
      .post('/notify/cancelacion')
      .send({
        email: 'user@example.com',
        nombre: 'Test User',
        servicio: 'Habitación Doble',
        fecha: '01/07/2026 14:30'
      });

    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Error al enviar el correo de cancelación');
  });
});

describe('Mailer Service', () => {
  it('should export enviarCorreo function', () => {
    expect(typeof enviarCorreo).toBe('function');
  });
});
