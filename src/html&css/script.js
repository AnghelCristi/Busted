
function check_if_empty(path) {

    let empty_or_spaces_regex = /^\s*$/;

    if ($(path).length != 1) {

        console.log("More than one result, check your path!");
        return 0;

    } else if ($(path).length == 1) {

        if ($(path)[0].value.match(empty_or_spaces_regex)) {
            return 0;
        }
    }

    return 1;
}

function check_url(url) {

    url_validation_regex = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;

    if (url.match(url_validation_regex)) {
        return 1;
    }

    return 0;
}

function price_request() {

    var supported_domains = ['www.emag.ro'];
    var supported_domains_regex = {};

    supported_domains_regex['www.emag.ro'] = [/EM.productFullPrice = [1-9]+[0-9]*\.*[0-9]*;/, /[1-9]+[0-9]*\.*[0-9]*/];

    var eligible_requests = {};

    chrome.storage.local.get(async function (result) {

        const date = new Date();
        let day = date.getDate();
        let month = date.getMonth() + 1;
        let year = date.getFullYear();

        let currentDate = `${month}/${day}/${year}`;

        for (const key in result['data_busted']) {
            domanin_name = (new URL(result['data_busted'][key])).hostname;
            if (supported_domains.includes(domanin_name) && currentDate !== result['data_busted'][key][2]) {
                eligible_requests[key] = result['data_busted'][key];
            }
        }

        if (result['chart_data'] === undefined) {

            chart_data = {};

            chrome.storage.local.set({ chart_data }, function () {
                console.log('init chart_data');
            });
        }

        var number_of_requests_done = 0;
        var total_number_of_request = Object.keys(eligible_requests).length;

        if (total_number_of_request != 0){

            if ($('.spinner-border.text-primary').length == 0){

                $('<br><br><div class="spinner-border text-primary"></div>').appendTo('.page_info');

            }

        } else if (total_number_of_request == 0){

            if ($('.alert.alert-success').length == 0){

                $('<br><br><div class="alert alert-success" role="alert">Nothing to update :(</div>').appendTo('.page_info')
            }
        }

        for (const request_to in eligible_requests) {

            var xhr = new XMLHttpRequest();
            xhr.open("GET", eligible_requests[request_to][0], true);

            xhr.onload = () => {
                if (xhr.readyState === xhr.DONE) {
                    if (xhr.status === 200) {

                        chart_data = result['chart_data'];

                        if (chart_data[eligible_requests[request_to][0]] === undefined) {
                            chart_data[eligible_requests[request_to][0]] = {};
                        }

                        data_busted = result['data_busted'];

                        var regex_get_price_section = supported_domains_regex[domanin_name][0];
                        var regex_get_price = supported_domains_regex[domanin_name][1];

                        price = xhr.responseText.match(regex_get_price_section)[0].match(regex_get_price)[0];

                        data_busted[request_to][0] = eligible_requests[request_to][0];
                        data_busted[request_to][1] = price;
                        data_busted[request_to][2] = currentDate;

                        chart_data[eligible_requests[request_to][0]][currentDate] = price;

                        chrome.storage.local.set({ data_busted }, function () {
                            console.log('The data_busted was updated for: ' + request_to);
                        });

                        chrome.storage.local.set({ chart_data }, function () {
                            console.log('The chart_data was updated for: ' + request_to);
                        });

                        number_of_requests_done+=1;

                        if (number_of_requests_done == total_number_of_request){

                            $('.spinner-border').remove();
                      
                            $('<div class="alert alert-success" role="alert">The updates are done, open me again :)</div>').appendTo('.page_info')

                        }
                        
                    } else {
                        console.log("Something went wrong with the request for this url: " + url);
                        console.log("Status code: " + xhr.status);
                    }
                }
            };

            xhr.onerror = function () {
                console.log("Something went wrong with the request on: " + url);
            };

            xhr.send();

            await new Promise(r => setTimeout(r, 2000 + Math.floor(Math.random() * 1000)));
        }

    });
}

$(document).ready(function () {

    chrome.storage.local.get(function (result) {
        for (const key in result['data_busted']) {

            $('<div class="info_' + key.toString().replaceAll(" ", "_") + '"></div>').appendTo('.saved_pages');
            $('.saved_pages .info_' + key.toString().replaceAll(" ", "_")).append('<p class="short_description_info h5">Description: ' + key.toString() + '</p>');
            $('.saved_pages .info_' + key.toString().replaceAll(" ", "_")).append('<p class="current_price h5">Price: ' + result['data_busted'][key][1].toString() + '</p>');
            $('.saved_pages .info_' + key.toString().replaceAll(" ", "_")).append('<p class="last_update_date h5">Last price update: ' + result['data_busted'][key][2].toString() + '</p>');
            
            $('.saved_pages .info_' + key.toString().replaceAll(" ", "_")).append('<canvas id="priceChart_' + key.toString().replaceAll(" ", "_") + '" style="width:100%;max-width:700px"></canvas>');

            $('.saved_pages .info_' + key.toString().replaceAll(" ", "_")).append('<a href="' + result['data_busted'][key][0].toString() + '" class = "btn btn-warning">Product link</a>');
            $('.saved_pages .info_' + key.toString().replaceAll(" ", "_")).append('<a class="delete_info btn btn-danger m-2" href="#">Delete</a><br><br>');

            const extract_chart_data = result['chart_data'][result['data_busted'][key][0]];
        
            const xValues = [];
            const yValues = [];

            for (const date_chart in extract_chart_data) {
                xValues.push(date_chart);
            }

            xValues.sort((d1, d2) => {
                return new Date(d1) - new Date(d2)
            })

            for (const index in xValues){
                yValues.push(extract_chart_data[xValues[index]])
            }
        
            new Chart("priceChart_" + key.toString().replaceAll(" ", "_") , {
                type: "line",
                data: {
                    labels: xValues,
                    datasets: [{
                        fill: false,
                        backgroundColor: "rgba(255,0,0,1.0)",
                        borderColor: "rgba(255,0,0,0.1)",
                        data: yValues
                    }]
                },
                options: {
                    legend: { display: false },
                }
            });

        }
    });

    $('.save_page_info').click(function () {

        var short_description = check_if_empty(".page_info input[name='short_description']");
        var url = check_if_empty(".page_info input[name='url']");
        var error_message_path = ".page_info .error_message";
        var short_description_value = $(".page_info input[name='short_description']")[0].value;
        var url_value = $(".page_info input[name='url']")[0].value;

        if (short_description === 1 && url === 1) {

            $(error_message_path).each(function () {

                $(this).remove();

            });

            if (check_url(url_value) === 1) {

                $(error_message_path).each(function () {

                    if ($(this)[0].innerText == 'The url is not valid') {

                        $(this).remove();
                    }

                });

                chrome.storage.local.get(['data_busted'], function (result) {
                    var data_busted = {};
                    for (const key in result['data_busted']) {
                        data_busted[key] = result['data_busted'][key]
                    }
                    data_busted[short_description_value] = [url_value, -1, -1];
                    chrome.storage.local.set({ data_busted }, function () {
                        console.log('The data was saved');
                    });
                });

                if ($('.saved_pages .info_' + short_description_value.replaceAll(" ", "_")).length === 1) {

                    $('.saved_pages .info_' + short_description_value.replaceAll(" ", "_") + ' .url_info')[0].innerText = url_value;

                } else if ($('.saved_pages .info_' + short_description_value.replaceAll(" ", "_")).length === 0) {

                    $('<div class="info_' + short_description_value.replaceAll(" ", "_") + '"></div>').appendTo('.saved_pages');
                    $('.saved_pages .info_' + short_description_value.replaceAll(" ", "_")).append('<p class="short_description_info h5">Description: ' + short_description_value + '</p>');
                    $('.saved_pages .info_' + short_description_value.replaceAll(" ", "_")).append('<p class="current_price h5">Price: -1</p>');
                    $('.saved_pages .info_' + short_description_value.replaceAll(" ", "_")).append('<p class="last_update_date h5">Last price update: -1</p>');
                    $('.saved_pages .info_' + short_description_value.replaceAll(" ", "_")).append('<a href="' + url_value + '" class = "btn btn-warning">Product link</a>');
                    $('.saved_pages .info_' + short_description_value.replaceAll(" ", "_")).append('<a class="delete_info btn btn-danger m-2" href="#">Delete</a><br><br>');

                }

            } else {

                if ($(error_message_path).length == 0 || $(error_message_path).length == 1) {

                    $('<p class="error_message alert alert-danger">The url is not valid</p>').insertAfter($(".page_info .save_page_info"));
                }
            }

        } else {

            if ($(error_message_path).length == 0) {

                $('<p class="error_message alert alert-danger">Please fill in all the fields</p>').insertAfter($(".page_info .save_page_info"));

            } else {

                if ($(error_message_path).length == 1) {

                    $(error_message_path).each(function () {

                        if ($(this)[0].innerText == 'The url is not valid') {

                            $('<p class="error_message alert alert-danger">Please fill in all the fields</p>').insertAfter($(".page_info .save_page_info"));
                        }
                    });
                }
            }
        }

    });

    $(document).on('click', '.clear_page_info', function (e) {

        chrome.storage.local.get(['data_busted'], function (result) {
            var data_busted = {}

            chrome.storage.local.set({ data_busted }, function () {
                console.log('The data was deleted');
            });
        });

        $('.saved_pages').children().remove();

        e.preventDefault();

    });

    $(document).on('click', '.delete_info', function (e) {

        var to_be_deleted = $(this).parent()[0].className.split('info_')[1].toString();

        chrome.storage.local.get(['data_busted'], function (result) {
            var data_busted = result['data_busted'];;

            delete data_busted[to_be_deleted];

            chrome.storage.local.set({ data_busted }, function () {
                console.log('The selected data was deleted');
            });
        });


        $(this).parent().remove();

        e.preventDefault();

    });


    $(document).on('click', '.update_page_info', function (e) {

        price_request();

        e.preventDefault();

    });

});