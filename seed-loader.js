/* ============================================
   SEED DATA LOADER
   Loads initial data from embedded SEED_DATA on first run
   ============================================ */

function loadSeedData() {
  if (typeof SEED_DATA === 'undefined') return false;

  // Only load if no monthly data exists yet
  const existing = localStorage.getItem(STORAGE_KEY);
  if (existing) {
    const parsed = JSON.parse(existing);
    if (parsed.months && Object.keys(parsed.months).length > 0) {
      return false;
    }
  }

  saveData(SEED_DATA);
  console.log('Seed data loaded:', Object.keys(SEED_DATA.months).length, 'months');
  return true;
}
