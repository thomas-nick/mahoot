import { Button, Flex, Typography } from '@strapi/design-system';
import { useAPIErrorHandler, useFetchClient, useNotification } from '@strapi/strapi/admin';
import { useState } from 'react';

type EditViewContext = {
  model?: string;
  documentId?: string;
};

type SyncResponse = {
  ok?: boolean;
  created?: number;
  updated?: number;
  skipped?: number;
};

const MODEL_CONFIG: Record<
  string,
  { title: string; description: string; endpoint: string; successTitle: string; buttonLabel: string }
> = {
  'api::course-submission.course-submission': {
    title: 'Submission Tools',
    description: 'Backfill approved course submissions into published courses.',
    endpoint: '/api/course-submissions/sync-approved',
    successTitle: 'Approved course submission sync complete',
    buttonLabel: 'Run approved course sync',
  },
  'api::disc-submission.disc-submission': {
    title: 'Submission Tools',
    description: 'Backfill approved disc submissions into published discs.',
    endpoint: '/api/disc-submissions/sync-approved',
    successTitle: 'Approved disc submission sync complete',
    buttonLabel: 'Run approved disc sync',
  },
};

export default function SyncApprovedSubmissionsPanel(context: EditViewContext) {
  const config = context?.model ? MODEL_CONFIG[context.model] : undefined;
  if (!config) {
    return null;
  }

  const { post } = useFetchClient();
  const { toggleNotification } = useNotification();
  const { formatAPIError } = useAPIErrorHandler();
  const [isRunning, setIsRunning] = useState(false);

  const runSync = async () => {
    setIsRunning(true);
    try {
      const { data } = await post<SyncResponse>(config.endpoint, {});
      toggleNotification({
        type: 'success',
        title: config.successTitle,
        message: `Created: ${data?.created ?? 0}, Updated: ${data?.updated ?? 0}, Skipped: ${
          data?.skipped ?? 0
        }`,
      });
    } catch (error) {
      toggleNotification({
        type: 'danger',
        title: 'Sync failed',
        message: formatAPIError(error),
      });
    } finally {
      setIsRunning(false);
    }
  };

  return {
    title: config.title,
    content: (
      <Flex direction="column" gap={2} width="100%">
        <Typography variant="pi" textColor="neutral600">
          {config.description}
        </Typography>
        <Button onClick={runSync} loading={isRunning} disabled={isRunning} size="S" fullWidth>
          {config.buttonLabel}
        </Button>
      </Flex>
    ),
  };
}
