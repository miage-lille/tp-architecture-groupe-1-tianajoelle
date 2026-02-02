export class ParticipationAlreadyExistsException extends Error {
  constructor() {
    super('User is already participating in this webinar');
    this.name = 'ParticipationAlreadyExistsException';
  }
}
