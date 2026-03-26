import dotenv from 'dotenv';

dotenv.config();

import express from "express";
import cors from "cors";

//Import routes
import authRoutes from './routes/auth.js'
import userRoutes from './routes/user.js'
import pantryRoutes from './routes/pantry.js'
import recipeRoutes from './routes/recipe.js'
import mealPlanRoutes from './routes/mealPlan.js'
import shoppingListRoutes from './routes/shoppingList.js'

const app = express();

//Middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({extended: true}))

//Test route
app.get('/', (req, res) => {
    res.json({message: 'AI Recipe Generator API'})
})

//API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/pantry', pantryRoutes);
app.use('/api/recipe', recipeRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/meal-plans', mealPlanRoutes);
app.use('/api/shopping-list', shoppingListRoutes);

app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);

    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error',
        ...(process.env.NODE_ENV !== 'production' ? {stack: err.stack} : {})
    });
});

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
})
