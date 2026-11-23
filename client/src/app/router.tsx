import { createBrowserRouter, type RouteObject } from 'react-router';
import { NotFound } from '../features/errors/NotFound';
import { Home } from '../features/home/Home';
import { ProjectDetail } from '../features/projectDetail/ProjectDetail';
import { LanguageLayout } from './LanguageLayout';
import { RootRedirect } from './RootRedirect';

// Exported so tests can mount the same tree in a memory router.
export const routes: RouteObject[] = [
  { path: '/', element: <RootRedirect /> },
  {
    path: '/:lang',
    element: <LanguageLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'projects/:slug', element: <ProjectDetail /> },
      // Any unknown path under a valid language gets the translated 404, inside the layout.
      { path: '*', element: <NotFound /> },
    ],
  },
];

export const router = createBrowserRouter(routes);
