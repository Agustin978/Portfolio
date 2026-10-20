import { createBrowserRouter } from 'react-router';
import { Home } from '../features/home/Home';
import { LanguageLayout } from './LanguageLayout';
import { RootRedirect } from './RootRedirect';

export const router = createBrowserRouter([
  { path: '/', element: <RootRedirect /> },
  {
    path: '/:lang',
    element: <LanguageLayout />,
    children: [{ index: true, element: <Home /> }],
  },
  { path: '*', element: <RootRedirect /> },
]);
