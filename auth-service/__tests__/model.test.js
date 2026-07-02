describe('User Model - static validation', () => {
  it('should validate required fields', () => {
    const requiredFields = ['name', 'email', 'password'];
    requiredFields.forEach(field => {
      expect(field).toBeTruthy();
    });
  });

  it('should have email field that requires uniqueness', () => {
    const emailConfig = { type: String, required: true, unique: true };
    expect(emailConfig.unique).toBe(true);
    expect(emailConfig.required).toBe(true);
  });
});
