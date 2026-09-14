import { neon } from '@neondatabase/serverless';
const sql = neon('postgresql://nutridry_owner:f0bUAcB1FIdD@ep-bitter-cherry-a5i0s5r9-pooler.us-east-2.aws.neon.tech/nutridry?sslmode=require');
const res = await sql('SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1', ['products']);
console.log(res);
