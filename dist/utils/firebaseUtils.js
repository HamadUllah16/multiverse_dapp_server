"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkUser = exports.createUser = void 0;
exports.getUser = getUser;
const firebase_1 = require("../config/firebase");
const database_1 = require("firebase/database");
/**
 * Fetch a user by their publicKey
 */
function getUser(publicKey) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const usersRef = (0, database_1.query)((0, database_1.ref)(firebase_1.db, "users"), (0, database_1.orderByChild)("PublicKey"), (0, database_1.equalTo)(publicKey.toString()));
            const snapshot = yield (0, database_1.get)(usersRef);
            if (snapshot.exists()) {
                const users = snapshot.val();
                const userId = Object.keys(users)[0]; // Get the first matching user ID
                return Object.assign({ id: userId }, users[userId]); // Return user object with ID
            }
            else {
                return null; // User does not exist
            }
        }
        catch (error) {
            console.error("Error retrieving user:", error);
            return null;
        }
    });
}
/**
 * Create a new user with a random ID
 */
const createUser = (publicKey) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const newUserRef = (0, database_1.push)((0, database_1.ref)(firebase_1.db, "users")); // Generate a random user ID
        const userId = newUserRef.key; // Get the generated ID
        yield (0, database_1.set)(newUserRef, {
            id: userId, // Store user ID
            publicKey: publicKey.toString(),
            createdAt: new Date().toISOString(),
        });
        console.log("User created successfully:", userId);
        return userId;
    }
    catch (error) {
        console.error("Error creating user:", error);
        return null;
    }
});
exports.createUser = createUser;
/**
 * Check if a user exists using publicKey
 */
const checkUser = (publicKey) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield getUser(publicKey);
        if (user) {
            console.log("User found:", user);
            return user;
        }
        else {
            console.log("User not found");
            return false;
        }
    }
    catch (error) {
        console.error("Error checking user:", error);
        return false;
    }
});
exports.checkUser = checkUser;
//# sourceMappingURL=firebaseUtils.js.map