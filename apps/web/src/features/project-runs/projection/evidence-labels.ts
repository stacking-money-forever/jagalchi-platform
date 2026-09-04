/** Maps Nest-normalized evidenceRequirements tokens to Korean display hints. */
export function evidenceRequirementLabelKo(requirement: string): string {
  if (requirement === 'PR') return 'PR 머지';
  if (requirement.startsWith('CHANGED_PATH:')) {
    return `변경 경로 ${requirement.slice('CHANGED_PATH:'.length)}`;
  }
  if (requirement.startsWith('NAMED_CHECK:')) {
    const name = requirement.slice('NAMED_CHECK:'.length);
    if (name === 'ci/test') return '테스트 통과';
    return `CI 체크 ${name}`;
  }
  return requirement;
}
