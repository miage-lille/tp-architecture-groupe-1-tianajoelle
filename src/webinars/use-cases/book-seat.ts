import { IMailer } from 'src/core/ports/mailer.interface';
import { Executable } from 'src/shared/executable';
import { User } from 'src/users/entities/user.entity';
import { IUserRepository } from 'src/users/ports/user-repository.interface';
import { Participation } from 'src/webinars/entities/participation.entity';
import { ParticipationAlreadyExistsException } from 'src/webinars/exceptions/participation-already-exists';
import { WebinarFullException } from 'src/webinars/exceptions/webinar-full';
import { WebinarNotFoundException } from 'src/webinars/exceptions/webinar-not-found';
import { IParticipationRepository } from 'src/webinars/ports/participation-repository.interface';
import { IWebinarRepository } from 'src/webinars/ports/webinar-repository.interface';

type Request = {
  webinarId: string;
  user: User;
};
type Response = void;

export class BookSeat implements Executable<Request, Response> {
  constructor(
    private readonly participationRepository: IParticipationRepository,
    private readonly userRepository: IUserRepository,
    private readonly webinarRepository: IWebinarRepository,
    private readonly mailer: IMailer,
  ) {}

  async execute({ webinarId, user }: Request): Promise<Response> {
    const webinar = await this.webinarRepository.findById(webinarId);
    if (!webinar) {
      throw new WebinarNotFoundException();
    }

    const participations =
      await this.participationRepository.findByWebinarId(webinarId);

    const isAlreadyParticipating = participations.some(
      (p) => p.props.userId === user.props.id,
    );
    if (isAlreadyParticipating) {
      throw new ParticipationAlreadyExistsException();
    }

    const availableSeats = webinar.props.seats - participations.length;
    if (availableSeats <= 0) {
      throw new WebinarFullException();
    }

    const participation = new Participation({
      userId: user.props.id,
      webinarId,
    });
    await this.participationRepository.save(participation);

    const organizer = await this.userRepository.findById(
      webinar.props.organizerId,
    );
    if (organizer) {
      await this.mailer.send({
        to: organizer.props.email,
        subject: 'New participant registered',
        body: `A new participant (${user.props.email}) has registered for your webinar "${webinar.props.title}".`,
      });
    }
  }
}
