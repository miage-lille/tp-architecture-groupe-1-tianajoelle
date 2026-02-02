import { InMemoryMailer } from 'src/core/adapters/in-memory-mailer';
import { InMemoryUserRepository } from 'src/users/adapters/user-repository.in-memory';
import { User } from 'src/users/entities/user.entity';
import { InMemoryParticipationRepository } from 'src/webinars/adapters/participation-repository.in-memory';
import { InMemoryWebinarRepository } from 'src/webinars/adapters/webinar-repository.in-memory';
import { Participation } from 'src/webinars/entities/participation.entity';
import { Webinar } from 'src/webinars/entities/webinar.entity';
import { BookSeat } from 'src/webinars/use-cases/book-seat';

describe('Feature: Book a seat in a webinar', () => {
  let participationRepository: InMemoryParticipationRepository;
  let userRepository: InMemoryUserRepository;
  let webinarRepository: InMemoryWebinarRepository;
  let mailer: InMemoryMailer;
  let useCase: BookSeat;

  const organizer = new User({
    id: 'organizer-id',
    email: 'organizer@test.com',
    password: 'password',
  });

  const participant = new User({
    id: 'participant-id',
    email: 'participant@test.com',
    password: 'password',
  });

  const webinar = new Webinar({
    id: 'webinar-id',
    organizerId: organizer.props.id,
    title: 'My Webinar',
    startDate: new Date('2024-01-10T10:00:00.000Z'),
    endDate: new Date('2024-01-10T11:00:00.000Z'),
    seats: 10,
  });

  beforeEach(() => {
    participationRepository = new InMemoryParticipationRepository();
    userRepository = new InMemoryUserRepository([organizer, participant]);
    webinarRepository = new InMemoryWebinarRepository([webinar]);
    mailer = new InMemoryMailer();
    useCase = new BookSeat(
      participationRepository,
      userRepository,
      webinarRepository,
      mailer,
    );
  });

  describe('Scenario: happy path', () => {
    it('should book a seat successfully', async () => {
      await useCase.execute({
        webinarId: webinar.props.id,
        user: participant,
      });

      const participations = participationRepository.database;
      expect(participations).toHaveLength(1);
      expect(participations[0].props.userId).toBe(participant.props.id);
      expect(participations[0].props.webinarId).toBe(webinar.props.id);
    });

    it('should send an email to the organizer', async () => {
      await useCase.execute({
        webinarId: webinar.props.id,
        user: participant,
      });

      expect(mailer.sentEmails).toHaveLength(1);
      expect(mailer.sentEmails[0]).toEqual({
        to: organizer.props.email,
        subject: 'New participant registered',
        body: `A new participant (${participant.props.email}) has registered for your webinar "${webinar.props.title}".`,
      });
    });
  });

  describe('Scenario: webinar not found', () => {
    it('should throw an error', async () => {
      await expect(
        useCase.execute({
          webinarId: 'non-existent-webinar',
          user: participant,
        }),
      ).rejects.toThrow('Webinar not found');
    });

    it('should not create a participation', async () => {
      try {
        await useCase.execute({
          webinarId: 'non-existent-webinar',
          user: participant,
        });
      } catch (error) {}

      expect(participationRepository.database).toHaveLength(0);
    });
  });

  describe('Scenario: user is already participating', () => {
    beforeEach(async () => {
      participationRepository.database.push(
        new Participation({
          userId: participant.props.id,
          webinarId: webinar.props.id,
        }),
      );
    });

    it('should throw an error', async () => {
      await expect(
        useCase.execute({
          webinarId: webinar.props.id,
          user: participant,
        }),
      ).rejects.toThrow('User is already participating in this webinar');
    });

    it('should not create another participation', async () => {
      try {
        await useCase.execute({
          webinarId: webinar.props.id,
          user: participant,
        });
      } catch (error) {}

      expect(participationRepository.database).toHaveLength(1);
    });
  });

  describe('Scenario: webinar is full', () => {
    const fullWebinar = new Webinar({
      id: 'full-webinar-id',
      organizerId: organizer.props.id,
      title: 'Full Webinar',
      startDate: new Date('2024-01-10T10:00:00.000Z'),
      endDate: new Date('2024-01-10T11:00:00.000Z'),
      seats: 1,
    });

    beforeEach(() => {
      webinarRepository.database.push(fullWebinar);
      participationRepository.database.push(
        new Participation({
          userId: 'other-user-id',
          webinarId: fullWebinar.props.id,
        }),
      );
    });

    it('should throw an error', async () => {
      await expect(
        useCase.execute({
          webinarId: fullWebinar.props.id,
          user: participant,
        }),
      ).rejects.toThrow('Webinar is full, no seats available');
    });

    it('should not create a participation', async () => {
      const initialCount = participationRepository.database.length;

      try {
        await useCase.execute({
          webinarId: fullWebinar.props.id,
          user: participant,
        });
      } catch (error) {}

      expect(participationRepository.database).toHaveLength(initialCount);
    });
  });
});
