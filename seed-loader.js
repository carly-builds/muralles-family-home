/* ============================================
   SEED DATA LOADER
   Loads initial data from seed-data.json on first run
   ============================================ */

async function loadSeedData() {
  // Only load if no data exists yet
  const existing = localStorage.getItem(STORAGE_KEY);
  if (existing) {
    const parsed = JSON.parse(existing);
    // Check if it already has months data (not a fresh install)
    if (parsed.months && Object.keys(parsed.months).length > 0) {
      return false;
    }
  }

  try {
    const response = await fetch('seed-data.json');
    if (!response.ok) return false;
    const seedData = await response.json();

    // Save to localStorage
    saveData(seedData);
    appData = seedData;

    console.log('Seed data loaded:', Object.keys(seedData.months).length, 'months');
    return true;
  } catch (e) {
    console.log('No seed data found, starting fresh');
    return false;
  }
}
