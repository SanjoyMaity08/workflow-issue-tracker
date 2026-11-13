import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Team name is required'],
      trim: true,
    },
    /**
     * Short prefix used to build issue identifiers, e.g. "ENG" -> ENG-1, ENG-2.
     */
    key: {
      type: String,
      required: [true, 'Team key is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    icon: {
      type: String,
      default: 'ffffe0',
    },
    color: {
      type: String,
      default: '#5e6ad2',
    },
    description: {
      type: String,
      default: '',
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    /**
     * Monotonically increasing counter used to generate issue identifiers.
     * Incremented atomically ($inc) so two concurrent requests can never
     * generate the same identifier for the same team.
     */
    issueCounter: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const Team = mongoose.model('Team', teamSchema);

export default Team;
