import db from "../config/db.js";

class ShoppingList {
    static columns = null;

    static async getColumns() {
        if (this.columns) {
            return this.columns;
        }

        const result = await db.query(
            `SELECT column_name
             FROM information_schema.columns
             WHERE table_schema = 'public'
             AND table_name = 'shopping_list_items'`
        );

        this.columns = new Set(result.rows.map((row) => row.column_name));
        return this.columns;
    }

    /**
     * Generate shopping list from meal plan
     */
    static async generateFromMealPlan(userId, startDate, endDate) {
        const client = await db.pool.connect();

        try {
            await client.query('BEGIN');
            const columns = await this.getColumns();
            const hasFromMealPlan = columns.has('from_meal_plan');
            const hasCategory = columns.has('category');

            //Clear existing meal plan items
            await client.query(
                hasFromMealPlan
                    ? 'DELETE FROM shopping_list_items WHERE user_id = $1 AND from_meal_plan = true'
                    : 'DELETE FROM shopping_list_items WHERE user_id = $1',
                [userId]
            );

            //Get all ingredients from meal plan recipes
            const result = await client.query(
                `SELECT ri.ingredient_name, ri.unit, SUM(ri.quantity) as total_quantity
            FROM meal_plans mp
            JOIN recipe_ingredients ri ON mp.recipe_id = ri.recipe_id
            WHERE mp.user_id = $1
            AND mp.meal_date >= $2
            AND mp.meal_date <= $3
            GROUP BY ri.ingredient_name, ri.unit`,
                [userId, startDate, endDate]
            );

            const ingredients = result.rows;

            //Get pantry items to subtract
            const pantryResult = await client.query(
                `SELECT name, quantity, unit FROM pantry_items WHERE user_id = $1`,
                [userId]
            );

            const pantryMap = new Map();
            pantryResult.rows.forEach(item => {
                const key = `${item.name.toLowerCase()}_${item.unit}`;
                pantryMap.set(key, item.quantity);
            });

            //Insert shopping list items (subtract pantry quantities)
            for (const ing of ingredients) {
                const key = `${ing.ingredient_name.toLowerCase()}_${ing.unit}`;
                const pantryQty = pantryMap.get(key) || 0;
                const neededQty = Math.max(0, parseFloat(ing.total_quantity) - parseFloat(pantryQty));

                if (neededQty > 0) {
                    if (hasFromMealPlan && hasCategory) {
                        await client.query(
                            `INSERT INTO shopping_list_items
                            (user_id, ingredient_name, quantity, unit, from_meal_plan, category)
                            VALUES ($1, $2, $3, $4, true, $5)`,
                            [userId, ing.ingredient_name, neededQty, ing.unit, 'Uncategorized']
                        );
                    } else if (hasFromMealPlan) {
                        await client.query(
                            `INSERT INTO shopping_list_items
                            (user_id, ingredient_name, quantity, unit, from_meal_plan)
                            VALUES ($1, $2, $3, $4, true)`,
                            [userId, ing.ingredient_name, neededQty, ing.unit]
                        );
                    } else if (hasCategory) {
                        await client.query(
                            `INSERT INTO shopping_list_items
                            (user_id, ingredient_name, quantity, unit, category)
                            VALUES ($1, $2, $3, $4, $5)`,
                            [userId, ing.ingredient_name, neededQty, ing.unit, 'Uncategorized']
                        );
                    } else {
                        await client.query(
                            `INSERT INTO shopping_list_items
                            (user_id, ingredient_name, quantity, unit)
                            VALUES ($1, $2, $3, $4)`,
                            [userId, ing.ingredient_name, neededQty, ing.unit]
                        );
                    }
                }
            }

            await client.query('COMMIT');

            return await this.findByUserId(userId);
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Add manual item to shopping list
     */
    static async create(userId, itemData) {
        const {ingredient_name, quantity, unit, category = 'Uncategorized'} = itemData;
        const columns = await this.getColumns();
        const hasFromMealPlan = columns.has('from_meal_plan');
        const hasCategory = columns.has('category');

        let result;
        if (hasFromMealPlan && hasCategory) {
            result = await db.query(
                `INSERT INTO shopping_list_items
                (user_id, ingredient_name, quantity, unit, category, from_meal_plan)
                VALUES ($1, $2, $3, $4, $5, false)
                RETURNING *`,
                [userId, ingredient_name, quantity, unit, category]
            );
        } else if (hasCategory) {
            result = await db.query(
                `INSERT INTO shopping_list_items
                (user_id, ingredient_name, quantity, unit, category)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING *`,
                [userId, ingredient_name, quantity, unit, category]
            );
        } else {
            result = await db.query(
                `INSERT INTO shopping_list_items
                (user_id, ingredient_name, quantity, unit)
                VALUES ($1, $2, $3, $4)
                RETURNING *`,
                [userId, ingredient_name, quantity, unit]
            );
        }

        return result.rows[0];
    }

    /**
     * Get all shopping list items for a user
     */
    static async findByUserId(userId) {
        const columns = await this.getColumns();
        const categoryExpr = columns.has('category') ? 'COALESCE(category, \'Uncategorized\') AS category' : '\'Uncategorized\' AS category';
        const fromMealPlanExpr = columns.has('from_meal_plan') ? 'from_meal_plan' : 'false AS from_meal_plan';
        const isCheckedExpr = columns.has('is_checked') ? 'is_checked' : 'false AS is_checked';
        const result = await db.query(
            `SELECT id, user_id, ingredient_name, quantity, unit,
             ${categoryExpr},
             ${fromMealPlanExpr},
             ${isCheckedExpr}
             FROM shopping_list_items
             WHERE user_id = $1
             ORDER BY category, ingredient_name`,
            [userId]
        );

        return result.rows;
    }

    /**
     * Get shopping list grouped by category
     */
    static async getGroupedByCategory(userId) {
        const columns = await this.getColumns();
        const categoryExpr = columns.has('category') ? "COALESCE(category, 'Uncategorized')" : "'Uncategorized'";
        const isCheckedExpr = columns.has('is_checked') ? 'is_checked' : 'false';
        const fromMealPlanExpr = columns.has('from_meal_plan') ? 'from_meal_plan' : 'false';
        const result = await db.query(
            `SELECT ${categoryExpr} AS category, json_agg(
            json_build_object(
            'id', id,
            'ingredient_name', ingredient_name,
            'quantity', quantity,
            'unit', unit,
            'is_checked', ${isCheckedExpr},
            'from_meal_plan', ${fromMealPlanExpr}
            )
            ORDER BY ingredient_name
        ) as items
         FROM shopping_list_items
         WHERE user_id = $1
         GROUP BY ${categoryExpr}
         ORDER BY ${categoryExpr}`,
            [userId]
        );

        return result.rows;
    }

    /**
     * Update shopping list item
     */
    static async update(id, userId, updates) {
        const {ingredient_name, quantity, unit, category, is_checked} = updates;
        const columns = await this.getColumns();
        const setClauses = [
            'ingredient_name = COALESCE($1, ingredient_name)',
            'quantity = COALESCE($2, quantity)',
            'unit = COALESCE($3, unit)'
        ];
        const params = [ingredient_name, quantity, unit];

        if (columns.has('category')) {
            setClauses.push(`category = COALESCE($${params.length + 1}, category)`);
            params.push(category);
        }

        if (columns.has('is_checked')) {
            setClauses.push(`is_checked = COALESCE($${params.length + 1}, is_checked)`);
            params.push(is_checked);
        }

        params.push(id, userId);

        const result = await db.query(
            `UPDATE shopping_list_items
             SET ${setClauses.join(', ')}
             WHERE id = $${params.length - 1} AND user_id = $${params.length}
             RETURNING *`,
            params
        );

        return result.rows[0];
    }

    /**
     * Toggle item checked status
     */
    static async toggleChecked(id, userId) {
        const columns = await this.getColumns();
        if (!columns.has('is_checked')) {
            const result = await db.query(
                `SELECT * FROM shopping_list_items
                 WHERE id = $1 AND user_id = $2`,
                [id, userId]
            );

            return result.rows[0];
        }

        const result = await db.query(
            `UPDATE shopping_list_items
        SET is_checked = NOT is_checked
        WHERE id = $1 AND user_id = $2
        RETURNING *`,
            [id, userId]
        );

        return result.rows[0];
    }

    /**
     * Clear all checked items
     */
    static async clearChecked(userId) {
        const columns = await this.getColumns();
        if (!columns.has('is_checked')) {
            return [];
        }

        const result = await db.query(
            `DELETE FROM shopping_list_items WHERE user_id = $1 AND is_checked = true RETURNING *`,
            [userId]
        );

        return result.rows;
    }

    /** 
     * Clear entire shopping list
     */
    static async clearAll(userId) {
        const result = await db.query(
            `DELETE FROM shopping_list_items WHERE user_id = $1 RETURNING *`,
            [userId]
        );

        return result.rows;
    }

    /**
     * Add checked items to pantry
     */
    static async addCheckedToPantry(userId) {
        const client = await db.pool.connect();

        try {
            await client.query('BEGIN')
            const columns = await this.getColumns();
            if (!columns.has('is_checked')) {
                await client.query('COMMIT');
                return [];
            }
            const categoryExpr = columns.has('category') ? 'category' : "'Other' AS category";

            //Get checked items
            const checkedItems = await client.query(
                `SELECT id, ingredient_name, quantity, unit, ${categoryExpr}
                 FROM shopping_list_items
                 WHERE user_id = $1 AND is_checked = true`,
                [userId]
            );

            //Add to pantry
            for (const item of checkedItems.rows) {
                await client.query(
                    `INSERT INTO pantry_items (user_id, name, quantity, unit, category)
                VALUES($1, $2, $3, $4, $5)`,
                    [userId, item.ingredient_name, item.quantity, item.unit, item.category]
                );
            }

            //Delete checked items from shopping list
            await client.query(
                `DELETE FROM shopping_list_items WHERE user_id = $1 AND is_checked = true`,
                [userId]
            );
             await client.query('COMMIT');

             return checkedItems.rows;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}

export default ShoppingList;
