import { Box, Chip, Stack, Typography } from '@mui/material';
import { clusterByCode } from '../../../shared/counsellingFramework.mjs';

export default function DiscoveryPlanSummary({ plan }) {
  if (!plan) return null;
  return <Stack spacing={1.25} sx={{ mt: 1.25 }}>
    {plan.sessionType && <Box>
      <Typography variant="caption" color="text.secondary">Session plan</Typography>
      <Typography variant="body2" fontWeight={650}>{plan.sessionType === 'package' ? `Package · ${plan.sessionCount} sessions` : 'Single session'}</Typography>
    </Box>}
    {plan.preferredDate && <Box>
      <Typography variant="caption" color="text.secondary">{plan.sessionType === 'package' ? 'First session preference' : 'Proposed session preference'}</Typography>
      <Typography variant="body2" fontWeight={650}>{new Date(`${plan.preferredDate}T12:00:00+05:30`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })} · {plan.preferredTime} IST</Typography>
    </Box>}
    {plan.concerns?.map(concern => {
      const cluster = clusterByCode(concern.clusterCode);
      return <Box key={concern.clusterCode}>
        <Typography variant="caption" color="text.secondary">{cluster?.group}</Typography>
        <Typography variant="body2" fontWeight={650}>{concern.clusterCode} · {cluster?.title || 'Counselling concern'}</Typography>
        <Stack direction="row" useFlexGap sx={{ gap: .5, flexWrap: 'wrap', mt: .75 }}>{concern.subConcerns.map(value => <Chip key={value} size="small" variant="outlined" label={value} sx={{ height: 'auto', '& .MuiChip-label': { py: .5, whiteSpace: 'normal' } }} />)}</Stack>
      </Box>;
    })}
  </Stack>;
}
