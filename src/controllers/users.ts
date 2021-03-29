import express from 'express'
import { IUsersRepository } from '../models'

export class UsersController {
  private readonly repo: IUsersRepository

  constructor(repo: IUsersRepository) {
    this.repo = repo
  }

  public async getUserDetails(req: express.Request, res: express.Response) {
    const user = await this.repo.findById(Number(req.params.id))

    if (!user) {
      return res.status(404).send({
        error: 'user not found'
      })
    }

    return res.status(200).send({
      data: user
    })
  }
}
