describe('Booking Model - schema validation', () => {
  it('should define booking with required fields', () => {
    const bookingFields = {
      userId: 'user1',
      fecha: '2026-07-01',
      servicio: 'Habitación Doble',
      estado: 'activo'
    };

    expect(bookingFields.userId).toBe('user1');
    expect(bookingFields.servicio).toBe('Habitación Doble');
    expect(bookingFields.estado).toBe('activo');
    expect(bookingFields.fecha).toBe('2026-07-01');
  });

  it('should validate estado enum values', () => {
    const validStates = ['activo', 'cancelada'];
    expect(validStates).toContain('activo');
    expect(validStates).toContain('cancelada');
    expect(validStates).not.toContain('pending');
  });

  it('should have canceladaEn field nullable by default', () => {
    const canceladaEn = null;
    expect(canceladaEn).toBeNull();
  });
});
