# AI Recipe Generator

## Overview
AI Recipe Generator is a full-stack web application that helps users create personalized recipes using AI, manage pantry ingredients, plan meals, and build shopping lists in one place.

The app combines an interactive frontend with a robust backend and AI-powered generation to streamline everyday cooking decisions and reduce food waste.

---

## Core Features

### 🍳 Recipe Generation
- AI-powered recipe creation using Gemini
- Personalized recipes based on available ingredients
- Customizable inputs (diet, preferences, constraints)

### 🥫 Pantry Management
- Add and manage available ingredients
- Track what you already have at home
- Reduce food waste by generating recipes from pantry items

### 📅 Meal Planning
- Plan meals across days or weeks
- Organize recipes into a structured schedule

### 🛒 Shopping List
- Automatically generate shopping lists from selected recipes
- Add or remove items manually
- Keep track of needed ingredients

### 👤 User System
- User authentication (login / signup)
- Persistent data storage
- Save recipes, pantry items, and meal plans

---

## Tech Stack

### Frontend
- React
- Vite
- CSS

### Backend
- Node.js
- Express.js

### Database
- PostgreSQL

### AI Integration
- Gemini API

---

## Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/ai-recipe-generator.git
cd ai-recipe-generator
```
### 2. Install Dependencies
```bash
Frontend
cd client
npm install
Backend
cd server
npm install
```
### 3. Set Up Environment Variables
```env
#Backend .env
PORT=8000
DATABASE_URL=your_postgresql_connection_string
GEMINI_API_KEY=your_gemini_api_key
JWT_SECRET=your_secret_key
NODE_ENV=development

#Frontend .env
VITE_API_BASE_URL=http://localhost:8000/api
```
### 4. Run the App
```bash
Start Backend
cd server
npm run dev
Start Frontend
cd client
npm run dev
```
### 5. Open in Browser

---

### Vision

AI Recipe Generator aims to simplify everyday cooking by combining AI, personalization, and organization tools into a single seamless experience.

### License

This project is for educational and development purposes.
