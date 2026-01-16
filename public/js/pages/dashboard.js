var colors=["#727cf5","#0acf97","#fa5c7c","#ffbc00"],dataColors=$("#total-orders-chart").data("colors"),options1={series:[65],chart:{type:"radialBar",height:81,width:81,sparkline:{enabled:!1}},plotOptions:{radialBar:{offsetY:0,hollow:{margin:0,size:"50%"},dataLabels:{name:{show:!1},value:{offsetY:5,fontSize:"14px",fontWeight:"600",formatter:function(o){return o+"k"}}}}},grid:{padding:{top:-18,bottom:-20,left:-20,right:-20}},colors:colors=dataColors?dataColors.split(","):colors},colors=(new ApexCharts(document.querySelector("#total-orders-chart"),options1).render(),["#727cf5","#0acf97","#fa5c7c","#ffbc00"]),dataColors=$("#new-users-chart").data("colors"),options2={series:[75],chart:{type:"radialBar",height:81,width:81,sparkline:{enabled:!1}},plotOptions:{radialBar:{offsetY:0,hollow:{margin:0,size:"50%"},dataLabels:{name:{show:!1},value:{offsetY:5,fontSize:"14px",fontWeight:"600",formatter:function(o){return o+"k"}}}}},grid:{padding:{top:-18,bottom:-20,left:-20,right:-20}},colors:colors=dataColors?dataColors.split(","):colors},colors=(new ApexCharts(document.querySelector("#new-users-chart"),options2).render(),["#5b69bc","#35b8e0","#10c469","#fa5c7c","#e3eaef"]),dataColors=$("#data-visits-chart").data("colors"),options={chart:{height:277,type:"donut"},series:[65,14,10,45],legend:{show:!0,position:"bottom",horizontalAlign:"center",verticalAlign:"middle",floating:!1,fontSize:"14px",offsetX:0,offsetY:7},labels:["Direct","Social","Marketing","Affiliates"],colors:colors=dataColors?dataColors.split(","):colors,stroke:{show:!1}},chart=new ApexCharts(document.querySelector("#data-visits-chart"),options),colors=(chart.render(),["#5b69bc","#10c469","#fa5c7c","#f9c851"]),dataColors=$("#statistics-chart").data("colors"),options={series:[{name:"Open Campaign",type:"bar",data:[89.25,98.58,68.74,108.87,77.54,84.03,51.24]}],chart:{height:301,type:"line",toolbar:{show:!1}},stroke:{width:0,curve:"smooth"},plotOptions:{bar:{columnWidth:"20%",barHeight:"70%",borderRadius:5}},xaxis:{categories:["2019","2020","2021","2022","2023","2024","2025"]},colors:colors=dataColors?dataColors.split(","):colors},colors=((chart=new ApexCharts(document.querySelector("#statistics-chart"),options)).render(),["#5b69bc","#10c469","#fa5c7c","#f9c851"]),dataColors=$("#revenue-chart").data("colors"),options={series:[{name:"Total Income",data:[82,85,70,90,75,78,65,50,72,60,80,70]},{name:"Total Expenses",data:[30,32,40,35,30,36,37,28,34,42,38,30]}],stroke:{width:3,curve:"straight"},chart:{height:299,type:"line",zoom:{enabled:!1},toolbar:{show:!1}},dataLabels:{enabled:!1},xaxis:{categories:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]},colors:colors=dataColors?dataColors.split(","):colors,tooltip:{shared:!0,y:[{formatter:function(o){return void 0!==o?"$"+o.toFixed(2)+"k":o}},{formatter:function(o){return void 0!==o?"$"+o.toFixed(2)+"k":o}}]}};(chart=new ApexCharts(document.querySelector("#revenue-chart"),options)).render();document.addEventListener("DOMContentLoaded", () => {
    loadBillingSummary();
    loadInvoiceAgeing();
    loadLatestPayments();
});

/* ---------------- Billing Summary ---------------- */
async function loadBillingSummary() {
    const res = await fetch("/api/dashboard/billing-summary");
    const data = await res.json();

    document.getElementById("totalBilled").innerText = `₹${data.total_billed || 0}`;
    document.getElementById("totalPaid").innerText = `₹${data.total_paid || 0}`;
    document.getElementById("outstanding").innerText = `₹${data.outstanding || 0}`;
}

/* ---------------- Invoice Ageing ---------------- */
async function loadInvoiceAgeing() {
    const res = await fetch("/api/dashboard/billing-ageing");
    const data = await res.json();

    document.getElementById("age0_30").innerText = `₹${data.d0_30 || 0}`;
    document.getElementById("age31_60").innerText = `₹${data.d31_60 || 0}`;
    document.getElementById("age61_90").innerText = `₹${data.d61_90 || 0}`;
    document.getElementById("age90_plus").innerText = `₹${data.d90_plus || 0}`;
}

/* ---------------- Latest Payments ---------------- */
async function loadLatestPayments() {
    const res = await fetch("/api/dashboard/latest-payments");
    const result = await res.json();

    const payments = result.payments || [];

    const tbody = document.getElementById("latestPaymentsBody");
    tbody.innerHTML = "";

    if (!payments.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center">No payments found</td></tr>`;
        return;
    }

    payments.forEach(p => {
        tbody.innerHTML += `
            <tr>
                <td>${p.paid_on ? new Date(p.paid_on).toLocaleDateString() : "-"}</td>
                <td>${p.invoice_id || "-"}</td>
                <td>${p.matter_name || "-"}</td>
                <td>${p.client_name || "-"}</td>
                <td>₹${p.amount}</td>
            </tr>
        `;
    });
}