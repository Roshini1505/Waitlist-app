# Waitlist Application
This is a full-stack waitlist application that allows users to sign up with their email, receive a referral code, and move up the waitlist by referring others. When a user reaches the top of the waitlist, they receive an email with a coupon code.

## Features

- User sign-up with email and optional referral code
- Dynamic waitlist position tracking
- Email notifications for top waitlist position
- Responsive design for both desktop and mobile

## Technologies Used

- Backend: Node.js, Express.js, MongoDB, Mongoose
- Frontend: React.js
- Email: Nodemailer
- Deployment: Heroku (or your preferred service)

## Screenshot
![Screenshot](frontend/Screenshot.png)


## Setup

### Prerequisites

- Node.js
- MongoDB

### Installation

1. **Clone the repository:**

   ```
   git clone https://github.com/yourusername/Waitlist-app.git
   cd Waitlist-app
   ```
2. **Install dependencies:**

   - **Backend:**
     Navigate to the backend directory (if separated) and install dependencies:
     
     ```
     cd backend
     npm install
     ```
   - **Frontend:**
     Navigate to the frontend directory (if separated) and install dependencies:

     ```
     cd ../frontend
     npm install
     ```
3. **Create a .env file:**

   Copy the .env.example file to a new .env file and add your environment-specific settings:

   ```
   cp .env.example .env
   ```

   

     
   
   

