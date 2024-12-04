# Work Diary

A fullstack web application for project/product management with a diary-like approach. Team members can write daily work diaries, share updates, and track tasks.

## Features

- Personal work diary with autosave
- Team feed to see everyone's updates
- Comments and reactions on diary entries
- Task management with todo lists
- Date-based filtering and navigation
- User authentication and authorization

## Tech Stack

- Frontend:
  - React with TypeScript
  - Material-UI for components
  - Zustand for state management
  - Vite for build tooling
  - React Router for navigation

- Backend:
  - Node.js with Express
  - TypeScript
  - MongoDB with Mongoose
  - JWT for authentication

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (running locally or a remote instance)

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd work-diary
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
- Copy `.env.example` to `.env`
- Update the values in `.env` with your configuration

4. Start the development servers:
```bash
npm run dev
```

This will start both the frontend (http://localhost:3000) and backend (http://localhost:5001) servers.

## Project Structure

```
work-diary/
├── frontend/           # React frontend application
│   ├── src/
│   │   ├── components/ # Reusable React components
│   │   ├── pages/     # Page components
│   │   ├── stores/    # Zustand state management
│   │   └── ...
│   └── ...
├── backend/           # Express backend application
│   ├── src/
│   │   ├── models/    # Mongoose models
│   │   ├── routes/    # Express routes
│   │   ├── middleware/# Express middleware
│   │   └── ...
│   └── ...
└── ...
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License. 