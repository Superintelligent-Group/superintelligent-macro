import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { UserGroup } from './UserGroup';

const meta = {
  title: 'UserGroup',
  component: UserGroup,
  argTypes: {
    size: {
      control: { type: 'select' },
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
    },
    maxUsers: {
      control: { type: 'number' },
    },
    suppressClick: {
      control: { type: 'boolean' },
    },
    showTooltip: {
      control: { type: 'boolean' },
    },
  },
} satisfies Meta<typeof UserGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    userIds: ['user-1', 'user-2', 'user-3'],
    size: 'xs',
    maxUsers: 3,
    suppressClick: true,
    showTooltip: false,
  },
};

export const WithOverflow: Story = {
  args: {
    userIds: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6'],
    size: 'xs',
    maxUsers: 3,
    suppressClick: true,
    showTooltip: false,
  },
};

export const SmallSize: Story = {
  args: {
    userIds: ['user-1', 'user-2', 'user-3', 'user-4'],
    size: 'sm',
    maxUsers: 3,
    suppressClick: true,
    showTooltip: false,
  },
};

export const MediumSize: Story = {
  args: {
    userIds: ['user-1', 'user-2', 'user-3', 'user-4'],
    size: 'md',
    maxUsers: 3,
    suppressClick: true,
    showTooltip: false,
  },
};

export const LargeSize: Story = {
  args: {
    userIds: ['user-1', 'user-2', 'user-3', 'user-4'],
    size: 'lg',
    maxUsers: 3,
    suppressClick: true,
    showTooltip: false,
  },
};

export const ExtraLargeSize: Story = {
  args: {
    userIds: ['user-1', 'user-2', 'user-3', 'user-4'],
    size: 'xl',
    maxUsers: 3,
    suppressClick: true,
    showTooltip: false,
  },
};

export const TwoUsers: Story = {
  args: {
    userIds: ['user-1', 'user-2'],
    size: 'xs',
    maxUsers: 3,
    suppressClick: true,
    showTooltip: false,
  },
};

export const SingleUser: Story = {
  args: {
    userIds: ['user-1'],
    size: 'xs',
    maxUsers: 3,
    suppressClick: true,
    showTooltip: false,
  },
};
