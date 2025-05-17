const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');

// SIGNUP route
router.post('/signup', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email dan password wajib diisi' });
  }

  if (password.length < 6) {
    return res.status(400).json({ success: false, message: 'Password minimal 6 karakter' });
  }

  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // langsung konfirmasi email
    });

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    res.status(201).json({ success: true, message: 'User created', uid: data.user.id });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
});

// LOGIN route (opsional: frontend login langsung pakai supabase client)
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email dan password wajib diisi' });
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return res.status(401).json({ success: false, message: 'Email atau password salah' });
    }

    res.status(200).json({ 
      success: true, 
      message: 'Login berhasil', 
      token: data.session.access_token,
      user: data.user 
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
});

module.exports = router;
