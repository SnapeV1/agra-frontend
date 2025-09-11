import { User } from "./user.model";

export interface AuthUser {
  token: string;
  user: User; 
  refreshToken?: string;
}
