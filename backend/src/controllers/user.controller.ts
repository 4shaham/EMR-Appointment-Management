import { Request, Response, NextFunction } from "express";
import { CreateUserUseCase } from "../usecases/users/CreateUserUseCase";
import { IUserRepository } from "../repositories/interfaces/IUserRepository";
import { sendSuccess } from "../utils/response";
import { AppError } from "../utils/AppError";

export class UserController {
  constructor(
    private createUserUseCase: CreateUserUseCase,
    private userRepo: IUserRepository
  ) {}

  createUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.createUserUseCase.execute({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        role: req.body.role,
        creatorUserId: req.user!.userId,
        creatorRole: req.user!.role,
      });

      sendSuccess(res, "User created successfully", user, 201);
    } catch (err) {
      next(err);
    }
  };

  getUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const role = req.query.role as string | undefined;
      let users;
      if (role && (role === "super_admin" || role === "receptionist" || role === "doctor")) {
        users = await this.userRepo.findByRole(role);
      } else {
        users = await this.userRepo.findByRole("receptionist"); // default to staff listing
      }
      sendSuccess(res, "Users retrieved successfully", users);
    } catch (err) {
      next(err);
    }
  };
}
