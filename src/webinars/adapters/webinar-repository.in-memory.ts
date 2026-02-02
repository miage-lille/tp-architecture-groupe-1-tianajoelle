import { Webinar } from 'src/webinars/entities/webinar.entity';
import { IWebinarRepository } from 'src/webinars/ports/webinar-repository.interface';

export class InMemoryWebinarRepository implements IWebinarRepository {
  constructor(public database: Webinar[] = []) {}
  async create(webinar: Webinar): Promise<void> {
    this.database.push(webinar);
  }
  async findById(id: string): Promise<Webinar | null> {
    return this.database.find((webinar) => webinar.props.id === id) ?? null;
  }
}
