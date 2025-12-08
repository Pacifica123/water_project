import React, { useState, useEffect, useMemo } from 'react';
import InputMask from 'react-input-mask';
import { fetchStructDataWithFilters } from '../api/fetch_records';
import { useNotification } from './NotificationContext';
import { translate } from '../utils/translations';

const Form32 = () => {
  const { confirm, success, error } = useNotification();
  const org = JSON.parse(localStorage.getItem('org') || '{}');
  const orgId = org.id;

  const [step, setStep] = useState(1);
  const [structData, setStructData] = useState({
    waterPool: [],
    permissions: [],
    instrumentBrands: [],
    waterObjects: []
  });
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    // Step1: organization autofill
    orgName: org.organisation_name || '',
    orgLegalForm: org.legal_form || '',
    orgInn: org.inn || '',
    // Step2: pool/section/unit
    poolId: '',
    sectionId: '',
    hydroUnitId: '',
    // Step3: permission & instrument
    permissionId: '',
    instrumentId: '',
    lastCalibrationDate: '',
    calibrationPeriod: '',
    // Step4: water object
    waterObjectId: '',
    objectCode: '',
    subsystemCode: '',
    coordinates: '',
    permissibleDischarge: 0,
    // Step5: volumes
    volumes: {
      polluted: '',
      normClean: '',
      underClean: '',
      bio: '',
      physChem: '',
      mech: '',
      total: 0,
    },
    // Step6: signature
    signature: '',
  });

  // Load struct data
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const data = await fetchStructDataWithFilters('get_struct32', { org_id: orgId });
        if (mounted && data) {
          setStructData({
            waterPool: Array.isArray(data.waterPool) ? data.waterPool : [],
            permissions: Array.isArray(data.permissions) ? data.permissions : [],
            instrumentBrands: Array.isArray(data.instrumentBrands) ? data.instrumentBrands : [],
            waterObjects: Array.isArray(data.waterObjects) ? data.waterObjects : []
          });
        }
      } catch (e) {
        error(translate('load_error'));
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [orgId]);

  // Derived lists
  const sections = useMemo(() => {
    const pool = structData.waterPool.find(p => p.id === formData.poolId);
    return pool && Array.isArray(pool.sections) ? pool.sections : [];
  }, [structData.waterPool, formData.poolId]);

  const hydroUnits = useMemo(() => {
    const sec = sections.find(s => s.id === formData.sectionId);
    return sec && Array.isArray(sec.hydroUnits) ? sec.hydroUnits : [];
  }, [sections, formData.sectionId]);

  const filteredWaterObjects = useMemo(() => {
    return structData.waterObjects.filter(wo => wo.sectionId === formData.sectionId);
  }, [structData.waterObjects, formData.sectionId]);

  // Auto-fill calibration
  useEffect(() => {
    const inst = structData.instrumentBrands.find(i => i.id === formData.instrumentId);
    if (inst) {
      setFormData(fd => ({
        ...fd,
        lastCalibrationDate: inst.calibration?.lastCalibrationDate || '',
        calibrationPeriod: inst.calibration?.calibrationPeriodMonths || ''
      }));
    }
  }, [formData.instrumentId, structData.instrumentBrands]);

  // Auto-fill water object details
  useEffect(() => {
    const wo = structData.waterObjects.find(w => w.id === formData.waterObjectId);
    if (wo) {
      setFormData(fd => ({
        ...fd,
        objectCode: wo.codes?.objectCode || '',
        subsystemCode: wo.codes?.subsystemCode || '',
        coordinates: wo.coordinates || '',
        permissibleDischarge: wo.permissibleDischargeThousandM3 || 0,
      }));
    }
  }, [formData.waterObjectId, structData.waterObjects]);

  // Calculate total volume
  useEffect(() => {
    const { polluted, normClean, underClean, bio, physChem, mech } = formData.volumes;
    const nums = [polluted, normClean, underClean, bio, physChem, mech].map(v => parseFloat(v) || 0);
    const total = nums.reduce((sum, n) => sum + n, 0);
    setFormData(fd => ({ ...fd, volumes: { ...fd.volumes, total } }));
  }, [formData.volumes.polluted, formData.volumes.normClean, formData.volumes.underClean, formData.volumes.bio, formData.volumes.physChem, formData.volumes.mech]);

  const handleNext = () => setStep(s => Math.min(s + 1, 6));
  const handlePrev = () => setStep(s => Math.max(s - 1, 1));

  const handleChange = (field, value) => {
    setFormData(fd => ({ ...fd, [field]: value }));
  };
  const handleVolumeChange = (field, value) => {
    setFormData(fd => ({
      ...fd,
      volumes: { ...fd.volumes, [field]: value }
    }));
  };

  const handleSubmit = async () => {
    try {
      await confirm(translate('confirm_submit'));
      // TODO: отправка formData на бэкенд
      success(translate('submit_success'));
    } catch {
      // cancelled
    }
  };

  if (loading) return <div>{translate('loading')}...</div>;

  return (
    <div className="form32">
      {step === 1 && (
        <section>
          <h2>{translate('step1_org')}</h2>
          <div><label>{translate('org_name')}:</label> <input value={formData.orgName} readOnly /></div>
          <div><label>{translate('org_legalForm')}:</label> <input value={formData.orgLegalForm} readOnly /></div>
          <div><label>{translate('org_inn')}:</label> <input value={formData.orgInn} readOnly /></div>
          <button onClick={handleNext}>{translate('next')}</button>
        </section>
      )}

      {step === 2 && (
        <section>
          <h2>{translate('step2_pool')}</h2>
          <div>
            <label>{translate('waterPool')}:</label>
            <select value={formData.poolId} onChange={e => handleChange('poolId', e.target.value)}>
              <option value="">--</option>
              {structData.waterPool.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label>{translate('section')}:</label>
            <select value={formData.sectionId} onChange={e => handleChange('sectionId', e.target.value)}>
              <option value="">--</option>
              {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label>{translate('hydroUnit')}:</label>
            <select value={formData.hydroUnitId} onChange={e => handleChange('hydroUnitId', e.target.value)}>
              <option value="">--</option>
              {hydroUnits.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <button onClick={handlePrev}>{translate('back')}</button>
          <button onClick={handleNext}>{translate('next')}</button>
        </section>
      )}

      {step === 3 && (
        <section>
          <h2>{translate('step3_permission')}</h2>
          <div>
            <label>{translate('permission')}:</label>
            <select value={formData.permissionId} onChange={e => handleChange('permissionId', e.target.value)}>
              <option value="">--</option>
              {structData.permissions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label>{translate('instrument')}:</label>
            <select value={formData.instrumentId} onChange={e => handleChange('instrumentId', e.target.value)}>
              <option value="">--</option>
              {structData.instrumentBrands.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </div>
          <div>
            <label>{translate('lastCalibrationDate')}:</label>
            <input type="date" value={formData.lastCalibrationDate} readOnly />
          </div>
          <div>
            <label>{translate('calibrationPeriod')} (мес):</label>
            <input type="number" value={formData.calibrationPeriod} readOnly />
          </div>
          <button onClick={handlePrev}>{translate('back')}</button>
          <button onClick={handleNext}>{translate('next')}</button>
        </section>
      )}

      {/* Steps 4-6 to be implemented similarly */}
    </div>
  );
};
export default Form32;
