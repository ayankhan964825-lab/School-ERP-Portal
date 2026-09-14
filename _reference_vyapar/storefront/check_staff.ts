import { getStaff } from './src/lib/database';

async function run() {
  try {
    const staff = await getStaff();
    console.log("STAFF DATA:");
    staff.forEach(s => {
      console.log(`- Name: ${s.name}, Email: ${s.email}, Level: ${s.hierarchy_level}, LevelType: ${typeof s.hierarchy_level}, Role: ${s.role}`);
    });
  } catch(e) {
    console.error(e);
  }
}
run();
