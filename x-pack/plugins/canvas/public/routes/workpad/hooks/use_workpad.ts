/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { useDispatch, useSelector } from 'react-redux';
import { useWorkpadService, usePlatformService } from '../../../services';
import { getWorkpad } from '../../../state/selectors/workpad';
import { setWorkpad } from '../../../state/actions/workpad';
// @ts-expect-error
import { setAssets } from '../../../state/actions/assets';
// @ts-expect-error
import { setZoomScale } from '../../../state/actions/transient';
import { CanvasWorkpad } from '../../../../types';

const getWorkpadLabel = () =>
  i18n.translate('xpack.canvas.workpadResolve.redirectLabel', {
    defaultMessage: 'Workpad',
  });

export const useWorkpad = (
  workpadId: string,
  loadPages: boolean = true,
  getRedirectPath: (workpadId: string) => string
): [CanvasWorkpad | undefined, string | Error | undefined] => {
  const workpadService = useWorkpadService();
  const workpadResolve = workpadService.resolve;
  const platformService = usePlatformService();
  const dispatch = useDispatch();
  const storedWorkpad = useSelector(getWorkpad);
  const [error, setError] = useState<string | Error | undefined>(undefined);

  const [resolveInfo, setResolveInfo] = useState<
    { aliasId: string | undefined; outcome: string } | undefined
  >(undefined);

  useEffect(() => {
    (async () => {
      try {
        const {
          outcome,
          aliasId,
          workpad: { assets, ...workpad },
        } = await workpadResolve(workpadId);

        setResolveInfo({ aliasId, outcome });

        if (outcome === 'conflict') {
          workpad.aliasId = aliasId;
        }

        if (storedWorkpad.id !== workpadId || storedWorkpad.aliasId !== aliasId) {
          dispatch(setAssets(assets));
          dispatch(setWorkpad(workpad, { loadPages }));
          dispatch(setZoomScale(1));
        }
      } catch (e) {
        setError(e as Error | string);
      }
    })();
  }, [
    workpadId,
    dispatch,
    setError,
    loadPages,
    workpadResolve,
    storedWorkpad.id,
    storedWorkpad.aliasId,
  ]);

  useEffect(() => {
    (() => {
      if (!resolveInfo) return;

      const { aliasId, outcome } = resolveInfo;
      if (outcome === 'aliasMatch' && platformService.redirectLegacyUrl && aliasId) {
        platformService.redirectLegacyUrl(`#${getRedirectPath(aliasId)}`, getWorkpadLabel());
      }
    })();
  }, [resolveInfo, getRedirectPath, platformService]);

  return [storedWorkpad.id === workpadId ? storedWorkpad : undefined, error];
};
