import { createCampaign, dashboard, payment, profile } from '../assets';

export const navlinks = [
  {
    name: 'dashboard',
    imgUrl: dashboard,
    link: '/',
  },
  {
    name: 'campaign',
    imgUrl: createCampaign,
    link: '/create-campaign',
  },
  {
    name: 'explorer',
    imgUrl: payment,
    link: '/explorer',
  },
  {
    name: 'profile',
    imgUrl: profile,
    link: '/profile',
  },
];
