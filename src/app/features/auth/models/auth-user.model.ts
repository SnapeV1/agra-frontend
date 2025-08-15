import { User } from "../../user/models/user.model";

export interface AuthUser {
  token: string;
  user: User; 
  refreshToken?: string;
}
