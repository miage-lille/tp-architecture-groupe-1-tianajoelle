export class WebinarFullException extends Error {
  constructor() {
    super('Webinar is full, no seats available');
    this.name = 'WebinarFullException';
  }
}
