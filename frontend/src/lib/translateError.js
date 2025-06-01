
export function translateSupabaseError(error) {
  if (!error || !error.message) return 'Terjadi kesalahan tidak diketahui';

  const map = {
    'Invalid login credentials': 'Email atau password salah',
    'Email not confirmed': 'Email belum dikonfirmasi',
    'User already registered': 'Pengguna sudah terdaftar',
    'Unable to validate email address: invalid format': 'Format email tidak valid',
    'Password should be at least 6 characters.': 'Password minimal 6 karakter',
    'User not found': 'Pengguna tidak ditemukan',
    'Signups not allowed for this instance': 'Pendaftaran tidak diperbolehkan',
    'Email rate limit exceeded': 'Batas pengiriman email telah tercapai',
  };

  return map[error.message] || 'Terjadi kesalahan: ' + error.message;
}
