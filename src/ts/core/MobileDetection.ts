export function isTouchDevice(): boolean
{
	if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
	try
	{
		const coarsePointer = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
		return coarsePointer || navigator.maxTouchPoints > 0;
	}
	catch
	{
		return false;
	}
}
