const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');

const UserSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: [true, 'Email é obrigatório'],
    unique: true,
    trim: true,
    lowercase: true,
    validate: [validator.isEmail, 'Email inválido']
  },
  password: { 
    type: String, 
    required: [true, 'Senha é obrigatória'],
    minlength: [8, 'Senha deve ter no mínimo 8 caracteres']
  },
  createdAt: { 
    type: Date, 
    default: Date.now,
    immutable: true
  },
  lastLogin: Date,
  isAdmin: {
    type: Boolean,
    default: false
  }
});

// Hash da senha antes de salvar
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Método para comparar senhas
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);