import { createFileRoute } from '@tanstack/react-router';

import Desktop from '@/components/system/Desktop';

export const Route = createFileRoute('/')({
  component: Desktop,
});
