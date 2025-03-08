//src\gamehub\gamehubRoutes.ts

import { Router, RequestHandler, Request, Response } from 'express';
import { verifyUser } from './middleware';  // Import the verifyUser middleware
import { createTournamentController, createTournamentPoolController, getActiveTournamentController, registerForTournamentController } from './gamehubController';

const router = Router();

// Route to create tournament pool
router.post('/create-tournament-pool', createTournamentPoolController as unknown as RequestHandler);

// Route to create tournament 
router.post('/create-tournament', createTournamentController as unknown as RequestHandler);

// Route for registering a user for a tournament
router.post('/register-for-tournament', registerForTournamentController as unknown as RequestHandler);

// Route for user authentication (verify the user with publicKey in headers)
router.post('/verify-user', verifyUser as unknown as RequestHandler, (req: Request, res: Response) => {
    // If the verifyUser middleware passes, this handler will be called
    res.status(200).json({
      message: 'User verified successfully'
    });
  });



export default router;
  // Define the route to fetch active tournament data
router.get("/active-tournament", verifyUser as unknown as RequestHandler, getActiveTournamentController as unknown as RequestHandler);