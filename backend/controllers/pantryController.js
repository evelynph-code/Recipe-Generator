import PantryItem from "../models/PantryItems.js";

const isValidDateString = (value) => {
    if (value === undefined || value === null || value === '') {
        return true;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));

    return date.getUTCFullYear() === year
        && date.getUTCMonth() === month - 1
        && date.getUTCDate() === day;
};

/**
 * Get all pantry items
 */
export const getPantryItems = async (req, res, next) => {
    try {
        const {category, is_running_low, search} = req.query;

        const items = await PantryItem.findByUserId(req.user.id, {
            category,
            is_running_low: is_running_low === 'true' ? true : undefined,
            search
        });

        res.json({
            success: true,
            data: {items}
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Get pantry stats
 */
export const getPantryStats = async (req, res, next) => {
    try {
        const stats = await PantryItem.getStats(req.user.id);

        res.json({
            success: true,
            data: {stats}
        })
    } catch (error) {
        next(error);
    }
};

/**
 * Get items expiring soon
 */
export const getExpiringSoon = async (req, res, next) => {
    try {
        const days = parseInt(req.query.days) || 7;
        const items = await PantryItem.getExpiringSoon(req.user.id, days);

        res.json({
            success: true,
            data: {items}
        })
    } catch (error) {
        next(error);
    }
}

/**
 * Add pantry item
 */
export const addPantryItem = async (req, res, next) => {
    try {
        if (!isValidDateString(req.body.expiry_date)) {
            return res.status(400).json({
                success: false,
                message: 'expiry_date must be a real date in YYYY-MM-DD format'
            });
        }

        const item = await PantryItem.create(req.user.id, req.body);

        res.status(201).json({
            success: true,
            message: 'Item added to pantry',
            data: {item}
        })
    } catch (error) {
        next(error);
    }
}

/**
 * Update pantry item
 */
export const updatePantryItem = async (req, res, next) => {
    try {
        if (!isValidDateString(req.body.expiry_date)) {
            return res.status(400).json({
                success: false,
                message: 'expiry_date must be a real date in YYYY-MM-DD format'
            });
        }

        const {id} = req.params;
        const item = await PantryItem.update(id, req.user.id, req.body);

        if (!item) {
            return res.status(404).json({
                success: false,
                message: 'Pantry item not found'
            })
        }

        res.json({
            success: true,
            message: 'Pantry item updated',
            data: {item}
        })
    } catch (error) {
        next(error);
    }
}

/**
 * Delete pantry item
 */
export const deletePantryItem = async (req, res, next) => {
    try {
        const {id} = req.params;
        const item = await PantryItem.delete(id, req.user.id);

        if (!item) {
            return res.status(404).json({
                success: false,
                message: 'Pantry item not found'
            })
        }

        res.json({
            success: true,
            message: 'Pantry item deleted',
            data: {item}
        });
    } catch (error) {
        next(error);
    }
};
