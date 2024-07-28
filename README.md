# Waitlist Application

This is a full-stack application for a waitlist signup system for a new iPhone product. The application includes a frontend built with React and a backend built with Node.js, Express, and MongoDB.

> **Note:** This project was created as part of a job interview process to demonstrate my skills in full-stack development.

## Tech Stack

- **Frontend**: React
- **Backend**: Node.js, Express
- **Database**: MongoDB (using MongoDB Atlas)
- **Email Service**: EmailJS

## Screenshots

### Signup Page
![Signup Page](./frontend/Screenshot1.png)

### Confirmation Page
![Confirmation Page](./frontend/Screenshot2.png)

## Features

- User signup with email validation.
- Generation of unique referral links.
- Email notification on successful signup.
- Display user position in the waitlist.

## Getting Started

### Prerequisites

- Node.js and npm installed.
- MongoDB Atlas account.
- EmailJS account.

### Setup

1. **Clone the repository:**

    ```sh
    git clone https://github.com/your-username/your-repo.git
    cd your-repo
    ```

2. **Backend Configuration:**

    - Navigate to the backend directory:

      ```sh
      cd backend
      ```

    - Install the required dependencies:

      ```sh
      npm install
      ```

    - Create a `.env` file based on `.env.example`:

      ```sh
      touch .env
      ```

    - Add the following content to `.env`:

      ```env
      PORT=5000
      MONGO_URI=mongodb+srv://username:password@cluster0.mongodb.net/myDatabase?retryWrites=true&w=majority
      EMAILJS_SERVICE_ID=your_emailjs_service_id
      EMAILJS_TEMPLATE_ID=your_emailjs_template_id
      EMAILJS_USER_ID=your_emailjs_user_id
      BASE_URL=http://localhost:3000
      ```

3. **Frontend Configuration:**

    - Navigate to the frontend directory:

      ```sh
      cd ../frontend
      ```

    - Install the required dependencies:

      ```sh
      npm install
      ```

    - Create a `.env` file based on `.env.example`:

      ```sh
      touch .env
      ```

    - Add the following content to `.env`:

      ```env
      REACT_APP_EMAILJS_SERVICE_ID=your_emailjs_service_id
      REACT_APP_EMAILJS_TEMPLATE_ID=your_emailjs_template_id
      REACT_APP_EMAILJS_USER_ID=your_emailjs_user_id
      ```

### Running the Application

1. **Start the Backend Server:**

    - Navigate to the backend directory:

      ```sh
      cd backend
      ```

    - Start the server:

      ```sh
      npm start
      ```

    The backend server should now be running on `http://localhost:5000`.

2. **Start the Frontend Server:**

    - Navigate to the frontend directory:

      ```sh
      cd ../frontend
      ```

    - Start the development server:

      ```sh
      npm start
      ```

    The frontend server should now be running on `http://localhost:3000`.

## Deployment

To deploy this application, follow these steps:

1. **Build the Frontend:**

    - Navigate to the frontend directory:

      ```sh
      cd frontend
      ```

    - Start the application:

      ```sh
      npm start
      ```

2. **Deploy the Backend and Frontend:**

    - You can deploy the backend and frontend to your preferred hosting provider (e.g., Heroku, Vercel, Netlify).

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contact

For any questions or suggestions, please open an issue or contact `roshiniroshini66583@gmail.com`.





