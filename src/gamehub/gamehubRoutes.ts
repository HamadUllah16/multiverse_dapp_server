//src\gamehub\gamehubRoutes.ts

import { Router, RequestHandler, Request, Response } from 'express';
import { verifyUser } from './middleware';  // Import the verifyUser middleware
import { initializeTournamentPoolController, getActiveTournament, getAllGames, getTournamentById, getTournamentPoolController, getTournaments, registerForTournamentController, createTournament, getTournamentLeaderboardController, updateParticipantScoreController, getTournamentsByGameController, updateTournamentStatus } from './gamehubController';


const router = Router();

// Route to create tournament pool
router.post('/create-tournament', createTournament as unknown as RequestHandler);

// Route to update tournament status
router.post('/update-tournament-status', updateTournamentStatus as unknown as RequestHandler);

router.post('/get-tournament-pool', getTournamentPoolController as unknown as RequestHandler);

// Route to create tournament
router.post('/create-tournament-pool', initializeTournamentPoolController as unknown as RequestHandler);

// Route for user authentication (verify the user with publicKey in headers)
router.post('/verify-user', verifyUser as unknown as RequestHandler, (req: Request, res: Response) => {
    // If the verifyUser middleware passes, this handler will be called
    res.status(200).json({
        message: 'User verified successfully'
    });
});

router.get('/tournaments', getTournaments as unknown as RequestHandler);

router.get('/tournament/:id', getTournamentById as unknown as RequestHandler);

router.get('/active-tournament', getActiveTournament as unknown as RequestHandler);

router.post('/user-participation', registerForTournamentController as unknown as RequestHandler);

router.get('/all-games', getAllGames as unknown as RequestHandler);

//Leaderboard Routes
// Route to get tournament leaderboard
router.get('/tournament-leaderboard/:id', getTournamentLeaderboardController as unknown as RequestHandler);

// Route to update participant score (protected)
router.post('/score/update', verifyUser as unknown as RequestHandler, updateParticipantScoreController as unknown as RequestHandler);

// Route to get tournaments by game
router.get('/get-tournaments-by-game/:gameId', getTournamentsByGameController as unknown as RequestHandler);




export default router;
// Define the route to fetch active tournament data
router.get("/active-tournament", verifyUser as unknown as RequestHandler, getActiveTournament as unknown as RequestHandler);