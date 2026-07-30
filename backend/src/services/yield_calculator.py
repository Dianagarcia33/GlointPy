from datetime import date, timedelta, datetime
from typing import List, Tuple
from decimal import Decimal
from src.models.investor import Investor
from src.models.withdrawal import WithdrawalType, WithdrawalStatus
from src.schemas.yield_calc import YieldCalculationResult, YieldSegment
import math

def calculate_investment_yield(
    investment: Investor,
    requested_start_date: date,
    requested_end_date: date
) -> YieldCalculationResult:
    
    inv_start = investment.start_date.date() if investment.start_date else None
    
    if not inv_start or not investment.package or not investment.period:
        # Invalid investment configuration
        return YieldCalculationResult(
            investment_id=investment.id,
            requested_start_date=requested_start_date,
            requested_end_date=requested_end_date,
            effective_start_date=None,
            effective_end_date=None,
            total_days=0,
            total_yield=Decimal("0.00"),
            segments=[]
        )
        
    total_contract_days = investment.period.days
    
    # Subtract days from applied accelerations
    if hasattr(investment, 'accelerations') and investment.accelerations:
        for acc in investment.accelerations:
            if acc.applied:
                total_contract_days -= float(acc.days_to_reduce)
                
    contract_end_date = inv_start + timedelta(days=int(total_contract_days))
    
    # Effective dates logic
    eff_start = max(requested_start_date, inv_start)
    eff_end = min(requested_end_date, contract_end_date)
    
    if eff_start > eff_end:
        return YieldCalculationResult(
            investment_id=investment.id,
            requested_start_date=requested_start_date,
            requested_end_date=requested_end_date,
            effective_start_date=eff_start,
            effective_end_date=eff_end,
            total_days=0,
            total_yield=Decimal("0.00"),
            segments=[]
        )
        
    # Get all capital withdrawals that are approved/processed
    capital_withdrawals = [
        w for w in investment.withdrawals 
        if w.tipo == WithdrawalType.CAPITAL and w.estado in [WithdrawalStatus.PROCESSED, WithdrawalStatus.APPROVED]
    ]
    
    # Sort them by date
    capital_withdrawals.sort(key=lambda w: w.fecha_solicitud)
    
    # Build timeline of capital changes
    # We only care about events up to eff_end
    events = []
    for w in capital_withdrawals:
        # If withdrawal happened, capital is reduced starting from that day or the next day?
        # Usually it's reduced from the day it's requested/approved. We'll use fecha_solicitud.
        events.append({
            "date": w.fecha_solicitud.date() if isinstance(w.fecha_solicitud, datetime) else w.fecha_solicitud,
            "amount": getattr(w, 'monto', getattr(w, 'monto_neto', 0)),
            "w_id": w.id
        })
        
    segments: List[YieldSegment] = []
    current_date = eff_start
    total_yield = Decimal("0.00")
    total_days = 0
    
    # Function to get active capital on a given date
    def get_active_capital_at(check_date: date) -> Decimal:
        cap = Decimal(investment.package.value)
        for ev in events:
            if ev["date"] <= check_date:
                cap -= Decimal(ev["amount"])
        return max(Decimal("0.00"), cap)

    # To group by segments, we find all unique dates where capital changed between eff_start and eff_end
    segment_dates = [eff_start]
    for ev in events:
        if eff_start < ev["date"] <= eff_end:
            if ev["date"] not in segment_dates:
                segment_dates.append(ev["date"])
    
    if eff_end not in segment_dates:
        # We don't add eff_end as a start date, but it's the end boundary
        pass
        
    segment_dates.sort()
    
    for i in range(len(segment_dates)):
        seg_start = segment_dates[i]
        # End of this segment is either the day before the next segment_start, or eff_end
        if i + 1 < len(segment_dates):
            seg_end = segment_dates[i+1]
        else:
            seg_end = eff_end
            
        if seg_start > seg_end:
            continue
            
        days_in_seg = (seg_end - seg_start).days
        if days_in_seg == 0 and len(segment_dates) == 1:
            # If the user selects the exact same day for start and end, and there's no other segments, 
            # we can either return 0 or 1. Usually today - today = 0 yield.
            pass
            
        active_cap = get_active_capital_at(seg_start)
        
        # Calculate daily yield
        # Rendimiento Mensual = Capital Activo * (Periodo.percentage / 100)
        # Rendimiento Total Esperado = Rendimiento Mensual * Periodo.months
        # Rendimiento Diario Exacto = Rendimiento Total Esperado / Periodo.days
        
        pct = Decimal(str(investment.period.percentage)) / Decimal("100")
        months = Decimal(str(investment.period.months))
        p_days = Decimal(str(investment.period.days))
        
        if p_days == Decimal("0"):
            daily_yield = Decimal("0.00")
        else:
            rendimiento_mensual = active_cap * pct
            rendimiento_total = rendimiento_mensual * months
            daily_yield = rendimiento_total / p_days
            
        if days_in_seg == 0 and len(segment_dates) > 1:
            continue
            
        seg_yield = daily_yield * Decimal(str(days_in_seg))
        
        note = "Capital inicial" if active_cap == Decimal(investment.package.value) else "Capital tras retiros"
        if seg_end == contract_end_date and contract_end_date < requested_end_date:
            note += " (Vencimiento de contrato)"
        
        segments.append(YieldSegment(
            start_date=seg_start,
            end_date=seg_end,
            days=days_in_seg,
            active_capital=active_cap,
            daily_yield=daily_yield,
            segment_yield=seg_yield,
            note=note
        ))

        total_yield += seg_yield
        total_days += days_in_seg
        
    # Calculate acceleration bonus in money ($ COP) ONLY for bonuses earned/applied within the requested cycle range
    acceleration_bonus = Decimal("0.00")
    if hasattr(investment, 'accelerations') and investment.accelerations:
        for acc in investment.accelerations:
            if acc.applied:
                acc_dt = acc.created_at
                acc_date = acc_dt.date() if isinstance(acc_dt, datetime) else (acc_dt if isinstance(acc_dt, date) else None)
                if acc_date:
                    if requested_start_date <= acc_date <= requested_end_date:
                        acceleration_bonus += Decimal(str(acc.bonus_amount or 0.0))
                else:
                    acceleration_bonus += Decimal(str(acc.bonus_amount or 0.0))



    return YieldCalculationResult(
        investment_id=investment.id,
        requested_start_date=requested_start_date,
        requested_end_date=requested_end_date,
        effective_start_date=eff_start,
        effective_end_date=eff_end,
        total_days=total_days,
        total_yield=total_yield,
        acceleration_bonus=acceleration_bonus,
        segments=segments
    )

