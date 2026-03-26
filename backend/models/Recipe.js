import db from '../config/db.js';

class Recipe{
    static imageColumn = null;

    static async getImageColumn() {
        if (this.imageColumn) {
            return this.imageColumn;
        }

        const result = await db.query(
            `SELECT column_name
             FROM information_schema.columns
             WHERE table_schema = 'public'
             AND table_name = 'recipes'
             AND column_name IN ('image_url', 'img_url')`
        );

        const columns = new Set(result.rows.map(row => row.column_name));
        this.imageColumn = columns.has('image_url') ? 'image_url' : 'img_url';
        return this.imageColumn;
    }

    /**
     * Create a new recipe with ingredients and nutrition
     */
    static async create(userId, recipeData) {
        const client = await db.pool.connect();

        try {
            await client.query('BEGIN')

            const {
                name, 
                description, 
                cuisine_type,
                difficulty,
                prep_time,
                cook_time,
                servings,
                instructions,
                dietary_tags = [],
                user_notes,
                image_url,
                ingredients = [],
                nutrition = {}
            } = recipeData;

            const normalizedInstructions = Array.isArray(instructions) ? instructions : [];
            const imageColumn = await this.getImageColumn();

            //Insert recipe
            const recipeResult = await client.query(
                `INSERT INTO recipes
            (user_id, name, description, cuisine_type, difficulty, prep_time, cook_time, servings, instructions, dietary_tags, user_notes, ${imageColumn})
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *`,
                [userId, name, description, cuisine_type, difficulty, prep_time, cook_time, servings, JSON.stringify(normalizedInstructions), dietary_tags, user_notes, image_url]
            )

            const recipe = recipeResult.rows[0];

            //Insert ingredients
            if (ingredients.length > 0) {
                const ingredientValues = ingredients.map((ing, idx) =>
                    `($1, $${idx * 3 + 2}, $${idx*3+3}, $${idx*3+4})`).join(', ');

                const ingredientParams = [recipe.id];
                ingredients.forEach(ing => {
                    ingredientParams.push(ing.name, ing.quantity, ing.unit);
                });
                
                await client.query(
                    `INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit) VALUES ${ingredientValues}`,
                    ingredientParams
                );
            }

            //Insert nutrition
            if (nutrition && Object.keys(nutrition).length > 0) {
                await client.query(
                    `INSERT INTO recipe_nutrition (recipe_id, calories, protein, carbs, fats, fiber)
                VALUES ($1, $2, $3, $4, $5, $6)`,
                    [recipe.id, nutrition.calories, nutrition.protein, nutrition.carbs, nutrition.fats, nutrition.fiber]
                );
            }

            await client.query('COMMIT');

            //Fetch complete recipe
            return await this.findById(recipe.id, userId);
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get recipe by ID with ingredients and nutrition
     */
    static async findById(id, userId) {
        const imageColumn = await this.getImageColumn();
        const recipeResult = await db.query(
            `SELECT recipes.*, ${imageColumn} AS image_url
             FROM recipes
             WHERE id = $1 AND user_id = $2`,
            [id, userId]
        );

        if (recipeResult.rows.length === 0) {
            return null;
        }

        const recipe = recipeResult.rows[0]

        //Get ingredients
        const ingredientsResult = await db.query(
            `SELECT ingredient_name as name, quantity, unit FROM recipe_ingredients WHERE recipe_id = $1`,
            [id]
        );

        //Get nutrition
        const nutritionResult = await db.query(
            `SELECT calories, protein, carbs, fats, fiber FROM recipe_nutrition WHERE recipe_id = $1`,
            [id]
        );

        return {
            ...recipe, 
            ingredients: ingredientsResult.rows,
            nutrition: nutritionResult.rows[0] || null
        };
    }

    /**
     * Get all recipes for a user with filters
     */
    static async findByUserId(userId, filters = {}) {
        const imageColumn = await this.getImageColumn();
        let query = `SELECT r.*, r.${imageColumn} AS image_url, rn.calories FROM recipes r LEFT JOIN recipe_nutrition rn ON r.id = rn.recipe_id WHERE r.user_id = $1`;
        const params = [userId];
        let paramCount = 1;

        if (filters.search) {
            paramCount++;
            query += ` AND (r.name ILIKE $${paramCount} OR r.description ILIKE $${paramCount})`;
            params.push(`%${filters.search}%`);
        }

        if (filters.difficulty) {
            paramCount++;
            query += ` AND r.difficulty = $${paramCount}`;
            params.push(filters.difficulty);
        }

        if (filters.dietary_tag) {
            paramCount++;
            query += ` AND $${paramCount} = ANY(r.dietary_tags)`;
            params.push(filters.dietary_tag);
        }

        if (filters.cuisine_type) {
            paramCount++;
            query += ` AND r.cuisine_type = $${paramCount}`;
            params.push(filters.cuisine_type);
        }

        if (filters.max_cook_time) {
            paramCount++;
            query += ` AND r.cook_time <= $${paramCount}`;
            params.push(filters.max_cook_time)
        }

        //Sorting
        const allowedSortFields = new Set(['created_at', 'updated_at', 'name', 'cook_time', 'prep_time', 'difficulty']);
        const sortBy = allowedSortFields.has(filters.sort_by) ? filters.sort_by : 'created_at';
        const sortOrder = filters.sort_order === 'asc' ? 'ASC' : 'DESC';
        query += ` ORDER BY r.${sortBy} ${sortOrder}`;

        //Pagination
        const limit = filters.limit || 20;
        const offset = filters.offset || 0;
        paramCount++;
        query += ` LIMIT $${paramCount}`;
        params.push(limit);
        paramCount++;
        query += ` OFFSET $${paramCount}`;
        params.push(offset);

        const result = await db.query(query, params);
        return result.rows;
    }

    /**
     * Get recent recipes
     */
    static async getRecent(userId, limit = 5) {
        const imageColumn = await this.getImageColumn();
        const result = await db.query(
            `SELECT r.*, r.${imageColumn} AS image_url, rn.calories
        FROM recipes r
        LEFT JOIN recipe_nutrition rn ON r.id = rn.recipe_id
        WHERE r.user_id = $1
        ORDER BY r.created_at DESC
        LIMIT $2`,
            [userId, limit]
        );

        return result.rows;
    }

    /**
     * Update
     */
    static async update(id, userId, updates) {
        const {
            name,
            description, 
            cuisine_type, 
            difficulty,
            prep_time,
            cook_time,
            servings,
            instructions,
            dietary_tags, 
            user_notes,
            image_url
        } = updates;
        const imageColumn = await this.getImageColumn();

        const result = await db.query(
            `UPDATE recipes
        SET name = COALESCE($1, name),
            description = COALESCE($2, description),
            cuisine_type = COALESCE($3, cuisine_type),
            difficulty = COALESCE($4, difficulty),
            prep_time = COALESCE($5, prep_time),
            cook_time = COALESCE($6, cook_time),
            servings = COALESCE($7, servings),
            instructions = COALESCE($8, instructions),
            dietary_tags = COALESCE($9, dietary_tags),
            user_notes = COALESCE($10, user_notes),
            ${imageColumn} = COALESCE($11, ${imageColumn})
        WHERE id = $12 AND user_id = $13
        RETURNING *`,
            [name, description, cuisine_type, difficulty, prep_time, cook_time, servings, instructions ? JSON.stringify(instructions) : null, dietary_tags, user_notes, image_url, id, userId]
        );

        return result.rows[0];
    }

    /**
     * Delete recipe
     */
    static async delete(id, userId) {
        const result = await db.query(
            `DELETE FROM recipes WHERE id = $1 AND user_id = $2 RETURNING *`,
            [id, userId]
        );

        return result.rows[0];
    }

    /**
     * Get recipe stats
     */
    static async getStats(userId) {
        const result = await db.query(
            `SELECT
            COUNT(*) as total_recipes,
            COUNT(DISTINCT cuisine_type) as cuisine_types_count,
            AVG(cook_time) as avg_cook_time
        FROM recipes
        WHERE user_id = $1`,
            [userId]
        );

        return result.rows[0];
    }
}

export default Recipe;
