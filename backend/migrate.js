import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pkg from 'pg'

const {Pool} = pkg;
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

//Load environment variables
dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL ? {rejectUnauthorized: false} : false
})

async function runMigration() {
    const client = await pool.connect();

    try {
        console.log('Running database migration...')

        //Read the schema file
        const schemaPath = path.join(__dirname, 'config', 'schema.sql')
        const schemaSql = fs.readFileSync(schemaPath, 'utf8')

        //Execute the schema
        await client.query(schemaSql)

        // Backfill older databases created before later schema renames/additions.
        await client.query(`
            ALTER TABLE recipes
            ADD COLUMN IF NOT EXISTS image_url TEXT;
        `);

        await client.query(`
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                    AND table_name = 'recipes'
                    AND column_name = 'img_url'
                ) THEN
                    UPDATE recipes
                    SET image_url = COALESCE(image_url, img_url)
                    WHERE img_url IS NOT NULL;
                END IF;
            END $$;
        `);

        await client.query(`
            ALTER TABLE recipe_nutrition
            ADD COLUMN IF NOT EXISTS calories INT;
        `);

        await client.query(`
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                    AND table_name = 'recipe_nutrition'
                    AND column_name = 'calorie'
                ) THEN
                    UPDATE recipe_nutrition
                    SET calories = COALESCE(calories, calorie)
                    WHERE calorie IS NOT NULL;
                END IF;
            END $$;
        `);

        await client.query(`
            ALTER TABLE shopping_list_items
            ADD COLUMN IF NOT EXISTS from_meal_plan BOOLEAN DEFAULT FALSE;
        `);

        await client.query(`
            ALTER TABLE shopping_list_items
            ADD COLUMN IF NOT EXISTS is_checked BOOLEAN DEFAULT FALSE;
        `);

        await client.query(`
            ALTER TABLE shopping_list_items
            ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        `);

        await client.query(`
            ALTER TABLE shopping_list_items
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        `);

        await client.query(`
            ALTER TABLE shopping_list_items
            ADD COLUMN IF NOT EXISTS category VARCHAR(100);
        `);

        console.log('Database migration completed successfully!')
        console.log('Table created')
        console.log('users')
        console.log('user_preferences')
        console.log('pantry_items')
        console.log('recipes')
        console.log('recipe_ingredients')
        console.log('recipe_nutrition')
        console.log('meal_plans')
        console.log('shopping_list_items')
    } catch (error) {
        console.error('Migration failed: ', error.message)
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration()
