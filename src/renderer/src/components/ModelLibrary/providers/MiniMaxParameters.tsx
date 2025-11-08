import { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { MiniMaxProvider } from '@common/agent';

import { Input } from '@/components/common/Input';
import { useEffectiveEnvironmentVariable } from '@/hooks/useEffectiveEnvironmentVariable';

type Props = {
  provider: MiniMaxProvider;
  onChange: (updated: MiniMaxProvider) => void;
};

export const MiniMaxParameters = ({ provider, onChange }: Props) => {
  const { t } = useTranslation();

  const apiKey = provider.apiKey || '';

  const { environmentVariable: minimaxApiKeyEnv } = useEffectiveEnvironmentVariable('MINIMAX_API_KEY');

  const handleApiKeyChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...provider, apiKey: e.target.value });
  };

  return (
    <div className="space-y-2">
      <Input
        label={t('minimax.apiKey')}
        type="password"
        value={apiKey}
        onChange={handleApiKeyChange}
        placeholder={
          minimaxApiKeyEnv
            ? t('settings.agent.envVarFoundPlaceholder', { source: minimaxApiKeyEnv.source })
            : t('settings.agent.envVarPlaceholder', { envVar: 'MINIMAX_API_KEY' })
        }
      />
    </div>
  );
};
